import React, { useState, useEffect, useRef } from 'react';
import { useRoomContext } from '@/context/RoomContext';
import type { Level, Choice, Question } from '@/types';
import './InterrogationPhase.css';

const Typewriter = ({ text, delay = 15, onComplete, skip = false, cacheKey = '' }: { text: string, delay?: number, onComplete?: () => void, skip?: boolean, cacheKey?: string }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const savedOnComplete = useRef(onComplete);
  
  useEffect(() => { 
    savedOnComplete.current = onComplete; 
  }, [onComplete]);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    // 1. Instantly complete if skipping or already cached in session storage
    if (skip || (cacheKey && sessionStorage.getItem(cacheKey))) {
      el.textContent = text;
      if (cacheKey) sessionStorage.setItem(cacheKey, 'true');
      if (savedOnComplete.current) savedOnComplete.current();
      return;
    }

    // 2. Perform raw DOM manipulation to bypass React's render cycle (fixes the stutter/half-way cutoffs)
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

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [text, delay, skip, cacheKey]);

  return <span ref={spanRef} />;
};

interface InterrogationPhaseProps {
  level: Level;
  status: string;
  localVotes: Record<number, number>;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  handleSelectChoice: (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => void;
}

export default function InterrogationPhase({ level, status, localVotes, totalPlayers, getQuestionConsensus, handleSelectChoice }: InterrogationPhaseProps) {
  const { room } = useRoomContext();

  // Initialize state directly from sessionStorage
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

  // --- THE NODE TRAVERSAL ENGINE ---
  const visibleQuestions: Question[] = [];
  let currentId: number | null = level.questions[0].id; // Root Node
  
  while (currentId) {
    const q = level.questions.find(x => x.id === currentId);
    if (!q) break;
    visibleQuestions.push(q);
    
    const consensus = getQuestionConsensus(q);
    if (consensus.isResolved && consensus.winningChoiceId) {
      const winningChoice = q.choices?.find(c => c.id === consensus.winningChoiceId);
      
      // If outcomes dictate a branch, follow it. Otherwise, fall back to linear progression.
      if (winningChoice?.outcomes?.next_question_id) {
        currentId = winningChoice.outcomes.next_question_id;
      } else {
        const currentIndex = level.questions.findIndex(x => x.id === q.id);
        currentId = level.questions[currentIndex + 1]?.id || null;
      }
    } else {
      currentId = null; // Traversal stops, awaiting player consensus
    }
  }

  const handleSuspectDone = (qId: number) => setSuspectTypingComplete(prev => ({ ...prev, [qId]: true }));
  const handleInvestigatorDone = (qId: number) => setInvestigatorTypingComplete(prev => ({ ...prev, [qId]: true }));

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

        // Read specific suspect reactions if they exist
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
                        return (
                          <span 
                            key={c.id} 
                            className={`choice-pill interactable ${isSelected ? 'selected' : ''}`}
                            onClick={(e) => handleSelectChoice(e, q.id, c, status)}
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                          >
                            {c.text}
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
                          text={status === 'completed' ? (q.choices?.find(c => c.is_correct)?.text || '...') : (winningChoice?.text || '...')} 
                          skip={skipTyping} 
                          delay={15} 
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
    </div>
  );
}