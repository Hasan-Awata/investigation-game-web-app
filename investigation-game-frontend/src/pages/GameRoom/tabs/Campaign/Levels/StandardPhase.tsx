import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Level, Question } from '@/types';
import './StandardPhase.css';

interface StandardPhaseProps {
  level: Level;
  status: string;
  totalPlayers: number;
  getQuestionConsensus: (question: Question) => { votesCast: number, isResolved: boolean, isTie: boolean, winningChoiceId: number | null };
}

export default function StandardPhase({ level, status, totalPlayers, getQuestionConsensus }: StandardPhaseProps) {
  const { localVotes, handleSelectChoice } = useInvestigationPhase();
  
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
        currentId = Number(winningChoice.outcomes.next_question_id);
      } else {
        const currentIndex = level.questions.findIndex(x => x.id === q.id);
        currentId = level.questions[currentIndex + 1]?.id || null;
      }
    } else {
      currentId = null; 
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

          const isLocked = consensus.isResolved; 
          const hasLocalVote = !!localVotes[q.id];

          return (
            <div key={q.id} className="question-item">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="question-number">Q{qIdx + 1}</span>
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