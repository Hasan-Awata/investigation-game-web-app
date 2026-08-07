import React, { useState, useEffect, useRef } from 'react';
import type { Level, Choice } from '../../../types';

// --- REUSABLE TYPEWRITER COMPONENT ---
const Typewriter = ({ 
  text, 
  delay = 45, 
  onComplete, 
  skip = false 
}: { 
  text: string, 
  delay?: number, 
  onComplete?: () => void, 
  skip?: boolean 
}) => {
  const [currentText, setCurrentText] = useState(skip ? text : '');
  const [currentIndex, setCurrentIndex] = useState(skip ? text.length : 0);
  
  const savedOnComplete = useRef(onComplete);
  useEffect(() => { savedOnComplete.current = onComplete; }, [onComplete]);

  const onCompleteFired = useRef(false);

  useEffect(() => {
    if (skip) {
      setCurrentText(text);
      if (savedOnComplete.current && !onCompleteFired.current) {
        onCompleteFired.current = true;
        savedOnComplete.current();
      }
      return;
    }

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length) {
      if (savedOnComplete.current && !onCompleteFired.current) {
        onCompleteFired.current = true;
        savedOnComplete.current();
      }
    }
  }, [currentIndex, delay, text, skip]);

  return <span>{currentText}</span>;
};

// --- MAIN INTERROGATION PHASE COMPONENT ---
interface InterrogationPhaseProps {
  level: Level;
  status: string;
  localVotes: Record<number, number>;
  totalPlayers: number;
  getQuestionConsensus: (qId: number) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  handleSelectChoice: (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => void;
}

export default function InterrogationPhase({
  level,
  status,
  localVotes,
  totalPlayers,
  getQuestionConsensus,
  handleSelectChoice
}: InterrogationPhaseProps) {
  const [suspectTypingComplete, setSuspectTypingComplete] = useState<Record<number, boolean>>({});
  const [investigatorTypingComplete, setInvestigatorTypingComplete] = useState<Record<number, boolean>>({});

  if (!level.questions) return null;

  const handleSuspectDone = (qId: number) => setSuspectTypingComplete(prev => ({ ...prev, [qId]: true }));
  const handleInvestigatorDone = (qId: number) => setInvestigatorTypingComplete(prev => ({ ...prev, [qId]: true }));

  return (
    <div className="interrogation-log" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      
      {level.questions.map((q, qIdx) => {
        const consensus = getQuestionConsensus(q.id);
        
        // Wait for the PREVIOUS investigator text to finish typing before showing the next suspect question
        const isVisible = status === 'completed' || qIdx === 0 || investigatorTypingComplete[level.questions![qIdx - 1].id];
        if (!isVisible) return null;

        const isGloballyLocked = consensus.isResolved;
        const skipTyping = status === 'completed'; 
        const isSuspectDone = suspectTypingComplete[q.id] || skipTyping;
        const hasLocalVote = !!localVotes[q.id];

        return (
          <div key={q.id} className="chat-exchange" style={{ animation: 'fadeIn 0.4s ease-out forwards', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* --- SUSPECT BUBBLE --- */}
            <div className="chat-bubble suspect-bubble" style={{ alignSelf: 'flex-start', background: 'rgba(20, 21, 24, 0.8)', borderLeft: '3px solid var(--accent-crimson)', padding: '1rem', borderRadius: '4px', maxWidth: '85%', boxShadow: '4px 4px 0px rgba(0,0,0,0.3)' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-crimson)', marginBottom: '0.5rem' }}>SUSPECT</span>
              <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.6' }}>
                <Typewriter 
                  text={q.text} 
                  skip={skipTyping} 
                  onComplete={() => handleSuspectDone(q.id)} 
                />
              </p>
            </div>

            {/* --- INVESTIGATOR INTERACTION --- */}
            {isSuspectDone && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', animation: 'fadeIn 0.4s ease-out' }}>
                
                {/* STATE 1: Awaiting Votes or Tie (STRICTLY ACTIVE PHASES ONLY) */}
                {status === 'active' && !isGloballyLocked ? (
                  <div style={{ 
                    background: hasLocalVote ? 'rgba(255, 179, 0, 0.05)' : 'transparent',
                    border: hasLocalVote ? '1px dashed var(--accent-amber)' : '1px solid transparent',
                    padding: hasLocalVote ? '1rem' : '0',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    transition: 'all 0.3s ease'
                  }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: consensus.isTie ? 'var(--accent-crimson)' : (hasLocalVote ? 'var(--accent-amber)' : 'var(--text-secondary)') }}>
                      {consensus.isTie 
                        ? '⚠️ TIE DETECTED: AWAITING TIE-BREAKER' 
                        : hasLocalVote 
                          ? `AWAITING TEAM (${consensus.votesCast}/${totalPlayers})` 
                          : `SELECT RESPONSE (${consensus.votesCast}/${totalPlayers})`
                      }
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      {q.choices?.map(c => {
                        const isSelected = localVotes[q.id] === c.id;
                        let pillClass = 'choice-pill interactable';
                        if (isSelected) pillClass += ' selected';
                        
                        return (
                          <span 
                            key={c.id} 
                            className={pillClass}
                            style={{ 
                              padding: '0.75rem 1rem', 
                              fontSize: '0.9rem',
                              ...(isSelected ? { background: 'var(--bg-dark)', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', boxShadow: 'inset 3px 0 0 0 var(--accent-cyan)' } : {})
                            }}
                            onClick={(e) => handleSelectChoice(e, q.id, c, status)}
                          >
                            {c.text}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  
                /* STATE 2: Consensus Reached OR Phase is Completed - Show the final Chat Bubble */
                  (isGloballyLocked || status === 'completed') && (
                    <div className="chat-bubble agent-bubble" style={{ background: 'rgba(90, 138, 158, 0.1)', borderRight: '3px solid var(--accent-cyan)', padding: '1rem', borderRadius: '4px', boxShadow: '-4px 4px 0px rgba(0,0,0,0.3)', width: '100%' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem', textAlign: 'left' }}>
                        INVESTIGATORS
                      </span>
                      <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.6', textAlign: 'left' }}>
                        <Typewriter 
                          text={status === 'completed' ? (q.choices?.find(c => c.is_correct)?.text || '...') : (q.choices?.find(c => c.id === consensus.winningChoiceId)?.text || '...')} 
                          skip={skipTyping} 
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