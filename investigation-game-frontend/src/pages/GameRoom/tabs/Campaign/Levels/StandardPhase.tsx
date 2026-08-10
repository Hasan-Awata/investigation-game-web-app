import React from 'react';
import type { Level, Choice, Question } from '@/types';
import './StandardPhase.css';

interface StandardPhaseProps {
  level: Level;
  status: string;
  localVotes: Record<number, number>;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
  handleSelectChoice: (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => void;
}

export default function StandardPhase({ level, status, localVotes, totalPlayers, getQuestionConsensus, handleSelectChoice }: StandardPhaseProps) {
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

  return (
    <>
      <h4 className="drawer-title">Required Verdicts</h4>
      <div className="questions-list">
        {visibleQuestions.map((q, qIdx) => {
          
          const consensus = getQuestionConsensus(q);
          const prevConsensus = qIdx > 0 ? getQuestionConsensus(visibleQuestions[qIdx - 1]) : null;
          
          const isVisible = status === 'completed' || qIdx === 0 || (prevConsensus && prevConsensus.isResolved);
          if (!isVisible) return null;

          // The question locks ONLY when all players have voted AND there is no tie.
          const isLocked = consensus.isResolved; 
          const hasLocalVote = !!localVotes[q.id];

          return (
            <div key={q.id} className="question-item">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="question-number">Q{qIdx + 1}</span>
                {!q.is_mandatory && (
                  <span title="Optional narrative evidence." style={{ color: 'var(--accent-amber)', marginTop: '0.35rem', fontSize: '1.1rem', cursor: 'help', animation: 'pulse-icon 2s infinite' }}>📄</span>
                )}
              </div>

              <div className="question-body">
                <p className="question-text">
                  {q.text}
                  {status === 'active' && !isLocked && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: consensus.isTie ? 'var(--accent-crimson)' : 'var(--accent-amber)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                      ↳ {consensus.isTie 
                          ? '⚠️ TIE DETECTED: CHANGE VOTE TO RESOLVE' 
                          : hasLocalVote 
                            ? `Vote recorded (${consensus.votesCast} / ${totalPlayers}). You may still change your choice.` 
                            : `Awaiting Agent consensus: ${consensus.votesCast} / ${totalPlayers} cast`
                        }
                    </span>
                  )}
                </p>
                <div className="choices-preview">
                  {q.choices?.map(c => {
                    const isSelected = localVotes[q.id] === c.id;
                    const isHistoricalCorrect = status === 'completed' && !c.outcomes?.gives_strike;

                    let pillClass = 'choice-pill';
                    if (isSelected) pillClass += ' selected';
                    if (isHistoricalCorrect) pillClass += ' historical-correct';
                    if (status === 'active' && !isLocked) pillClass += ' interactable';

                    return (
                      <span 
                        key={c.id} 
                        className={pillClass}
                        onClick={(e) => {
                          if (status === 'active' && !isLocked) handleSelectChoice(e, q.id, c, status);
                        }}
                      >
                        {c.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}