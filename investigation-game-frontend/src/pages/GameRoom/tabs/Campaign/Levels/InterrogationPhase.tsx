import React, { useState, useEffect, useRef } from 'react';
import type { Level, Choice, Question } from '@/types';
import './InterrogationPhase.css';

const Typewriter = ({ text, delay = 45, onComplete, skip = false }: { text: string, delay?: number, onComplete?: () => void, skip?: boolean }) => {
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

interface InterrogationPhaseProps {
  level: Level;
  status: string;
  localVotes: Record<number, number>;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  handleSelectChoice: (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => void;
}

export default function InterrogationPhase({ level, status, localVotes, totalPlayers, getQuestionConsensus, handleSelectChoice }: InterrogationPhaseProps) {
  const [suspectTypingComplete, setSuspectTypingComplete] = useState<Record<number, boolean>>({});
  const [investigatorTypingComplete, setInvestigatorTypingComplete] = useState<Record<number, boolean>>({});

  if (!level.questions) return null;

  const handleSuspectDone = (qId: number) => setSuspectTypingComplete(prev => ({ ...prev, [qId]: true }));
  const handleInvestigatorDone = (qId: number) => setInvestigatorTypingComplete(prev => ({ ...prev, [qId]: true }));

  return (
    <div className="interrogation-log">
      {level.questions.map((q, qIdx) => {
        const consensus = getQuestionConsensus(q);
        const isVisible = status === 'completed' || qIdx === 0 || investigatorTypingComplete[level.questions![qIdx - 1].id];
        if (!isVisible) return null;

        const isGloballyLocked = consensus.isResolved;
        const skipTyping = status === 'completed'; 
        const isSuspectDone = suspectTypingComplete[q.id] || skipTyping;
        const hasLocalVote = !!localVotes[q.id];

        return (
          <div key={q.id} className="chat-exchange">
            
            <div className="chat-bubble suspect-bubble">
              <span className="speaker-label suspect">SUSPECT</span>
              <p><Typewriter text={q.text} skip={skipTyping} onComplete={() => handleSuspectDone(q.id)} /></p>
            </div>

            {isSuspectDone && (
              <div className="investigator-interaction-area">
                {status === 'active' && !isGloballyLocked ? (
                  <div className={`vote-status-box ${hasLocalVote ? 'has-vote' : 'no-vote'}`}>
                    <span className="speaker-label" style={{ color: consensus.isTie ? 'var(--accent-crimson)' : (hasLocalVote ? 'var(--accent-amber)' : 'var(--text-secondary)') }}>
                      {consensus.isTie 
                        ? '⚠️ TIE DETECTED: AWAITING TIE-BREAKER' 
                        : hasLocalVote 
                          ? `AWAITING TEAM (${consensus.votesCast}/${totalPlayers})` 
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