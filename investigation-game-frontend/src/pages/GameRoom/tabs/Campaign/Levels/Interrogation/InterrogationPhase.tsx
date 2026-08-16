import { useState, useEffect, useRef } from 'react';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Level, Choice, Question } from '@/types';
import './InterrogationPhase.css';

// --- TYPEWRITER COMPONENT ---
const Typewriter = ({ text, delay = 15, onComplete, skip = false, cacheKey = '' }: { text: string, delay?: number, onComplete?: () => void, skip?: boolean, cacheKey?: string }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const savedOnComplete = useRef(onComplete);
  
  useEffect(() => { 
    savedOnComplete.current = onComplete; 
  }, [onComplete]);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    // Safety check for empty strings
    if (!text) {
      if (savedOnComplete.current) savedOnComplete.current();
      return;
    }

    if (skip || (cacheKey && sessionStorage.getItem(cacheKey))) {
      el.textContent = text;
      if (cacheKey) sessionStorage.setItem(cacheKey, 'true');
      if (savedOnComplete.current) savedOnComplete.current();
      return;
    }

    let i = 0;
    el.textContent = '';
    
    const interval = setInterval(() => {
      el.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (cacheKey) sessionStorage.setItem(cacheKey, 'true');
        if (savedOnComplete.current) savedOnComplete.current();
      }
    }, delay);

    return () => clearInterval(interval);
  }, [text, delay, skip, cacheKey]);

  return <span ref={spanRef} />;
};

interface InterrogationPhaseProps {
  level: Level;
  status: string;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  isHost: boolean;
  isSubmitting: boolean;
  handleSubmitTheory: (e: React.MouseEvent) => void;
}

export default function InterrogationPhase({ 
  level, status, totalPlayers, getQuestionConsensus, isHost, isSubmitting, handleSubmitTheory
}: InterrogationPhaseProps) {

  const { room, accumulatedEvidences } = useRoomState();
  const { localVotes, handleSelectChoice } = useInvestigationPhase();

  const checkIsLockedByNarrative = (choice: Choice) => {
    if (!choice.requirements) return false;
    const reqs = choice.requirements;

    if (reqs.required_evidence?.length > 0) {
      const hasAllEvidence = reqs.required_evidence.every((id: number) => 
        accumulatedEvidences.some(e => e.id === id)
      );
      if (!hasAllEvidence) return true;
    }

    if (reqs.required_choices?.length > 0) {
      const hasAllChoices = reqs.required_choices.every((id: number) => 
        room.votes?.some(v => v.choice_id === id)
      );
      if (!hasAllChoices) return true;
    }

    return false;
  };

  const [suspectTypingComplete, setSuspectTypingComplete] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    level.questions?.forEach(q => {
      if (sessionStorage.getItem(`room_${room.id}_suspect_${q.id}`)) initial[q.id] = true;
    });
    return initial;
  });

  const [investigatorTypingComplete, setInvestigatorTypingComplete] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    level.questions?.forEach(q => {
      if (sessionStorage.getItem(`room_${room.id}_investigator_${q.id}`)) initial[q.id] = true;
    });
    return initial;
  });

  if (!level.questions || level.questions.length === 0) return null;

  const visibleQuestions: Question[] = [];
  let currentId: number | null = level.questions[0].id; 
  
  while (currentId) {
    const q = level.questions.find(x => x.id === currentId);
    if (!q) break;
    visibleQuestions.push(q);
    
    const consensus = getQuestionConsensus(q);
    if (consensus.isResolved && consensus.winningChoiceId) {
      const winningChoice = q.choices?.find(c => c.id === consensus.winningChoiceId);
      
      if (winningChoice?.outcomes?.next_question_id) {
        // FIXED: Explicitly cast to Number to prevent strict equality JSON failures
        currentId = Number(winningChoice.outcomes.next_question_id);
      } else {
        const currentIndex = level.questions.findIndex(x => x.id === q.id);
        currentId = level.questions[currentIndex + 1]?.id || null;
      }
    } else {
      currentId = null; 
    }
  }

  const handleSuspectDone = (qId: number) => setSuspectTypingComplete(prev => ({ ...prev, [qId]: true }));
  const handleInvestigatorDone = (qId: number) => setInvestigatorTypingComplete(prev => ({ ...prev, [qId]: true }));

  const lastQuestion = visibleQuestions[visibleQuestions.length - 1];
  const isTerminalNode = lastQuestion && (!lastQuestion.choices || lastQuestion.choices.length === 0);
  const isLastSuspectDone = lastQuestion && (suspectTypingComplete[lastQuestion.id] || status === 'completed');

  return (
    <div className="interrogation-log">
      {visibleQuestions.map((q, qIdx) => {
        const consensus = getQuestionConsensus(q);
        const prevQ = qIdx > 0 ? visibleQuestions[qIdx - 1] : null;
        const isVisible = status === 'completed' || qIdx === 0 || (prevQ && investigatorTypingComplete[prevQ.id]);
        
        if (!isVisible) return null;

        const isGloballyLocked = consensus.isResolved;
        const skipTyping = status === 'completed'; 
        const isSuspectDone = suspectTypingComplete[q.id] || skipTyping;
        const hasLocalVote = !!localVotes[q.id];

        const winningChoice = q.choices?.find(c => c.id === consensus.winningChoiceId);
        const customReaction = winningChoice?.outcomes?.suspect_reaction; 

        return (
          <div key={q.id} className="chat-exchange">
            
            <div className="chat-bubble suspect-bubble">
              <span className="speaker-label suspect">SUSPECT {customReaction ? `[${customReaction}]` : ''}</span>
              <p>
                <Typewriter 
                  text={q.text} 
                  skip={skipTyping} 
                  delay={15} 
                  cacheKey={`room_${room.id}_suspect_${q.id}`} 
                  onComplete={() => handleSuspectDone(q.id)} 
                />
              </p>
            </div>

            {isSuspectDone && (
              <div className="investigator-interaction-area">
                {status === 'active' && !isGloballyLocked ? (
                  <div className={`vote-status-box ${hasLocalVote ? 'has-vote' : 'no-vote'}`}>
                    <span className="speaker-label" style={{ color: consensus.isTie ? 'var(--accent-crimson)' : (hasLocalVote ? 'var(--accent-amber)' : 'var(--text-secondary)') }}>
                      {consensus.isTie 
                        ? '⚠️ TIE DETECTED: CHANGE VOTE TO RESOLVE' 
                        : hasLocalVote 
                          ? `VOTE CAST (${consensus.votesCast}/${totalPlayers}) - YOU MAY REASSIGN` 
                          : `SELECT RESPONSE (${consensus.votesCast}/${totalPlayers})`
                      }
                    </span>
                    <div className="vote-choices-grid">
                      {q.choices?.map(c => {
                        const isSelected = localVotes[q.id] === c.id;
                        const isNarrativeLocked = checkIsLockedByNarrative(c);
                        const pillClass = isNarrativeLocked
                          ? 'choice-pill locked-choice'
                          : `choice-pill interactable ${isSelected ? 'selected' : ''}`;

                        return (
                          <span 
                            key={c.id} 
                            className={pillClass}
                            onClick={(e) => {
                              if (isNarrativeLocked) return;
                              handleSelectChoice(e, q.id, c, status);
                            }}
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                          >
                            {isNarrativeLocked ? '🔒 [ MISSING INTEL ]' : c.text}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  (isGloballyLocked || status === 'completed') && (
                    <div className="chat-bubble agent-bubble">
                      <span className="speaker-label investigator">INVESTIGATORS</span>
                      <p>
                        <Typewriter 
                          text={status === 'completed' ? (q.choices?.find(c => !c.outcomes?.gives_strike)?.text || '...') : (winningChoice?.text || '...')} 
                          skip={skipTyping} 
                          delay={40} 
                          cacheKey={`room_${room.id}_investigator_${q.id}`} 
                          onComplete={() => handleInvestigatorDone(q.id)}
                        />
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {isTerminalNode && isLastSuspectDone && status === 'active' && (
        <div className="submit-theory-container" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
          {isHost ? (
            <button className="btn-primary submit-theory-btn" disabled={isSubmitting} onClick={handleSubmitTheory}>
              {isSubmitting ? 'Processing...' : 'Submit Final Verdict'}
            </button>
          ) : (
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}>
              Awaiting Host to submit final verdict...
            </div>
          )}
        </div>
      )}
    </div>
  );
}