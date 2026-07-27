import { useState } from 'react';
import type { Level, Choice } from '../../../types';
import { lockVote, submitAssessment, triggerPersonaHint } from '../../../services/api';
import './Tabs.css';

interface CampaignTabProps {
  levels: Level[];
  currentLevelId: number;
  roomId: number;
  roomStatus: string; // <-- 1. Add the new prop
  onLevelCleared: () => void;
}

export default function CampaignTab({ levels, currentLevelId, roomId, roomStatus, onLevelCleared }: CampaignTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sortedLevels = [...levels].sort((a, b) => a.order_index - b.order_index);
  const currentLevelIndex = sortedLevels.find(l => l.id === currentLevelId)?.order_index || 0;

  const toggleExpand = (levelId: number, status: string) => {
    if (status === 'locked') return; 
    setExpandedId(expandedId === levelId ? null : levelId);
  };

  const handleSelectChoice = async (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => {
    e.stopPropagation(); 
    if (status !== 'active') return; 

    setVotes(prev => ({ ...prev, [questionId]: choice.id }));
    await lockVote(roomId, questionId, choice.id);
  };

  const handleSubmitTheory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmitting(true);
    
    const result = await submitAssessment(roomId);
    
    if (result.isSuccess) {
      if (result.value.status === 'success') {
        setFeedback({ type: 'success', message: 'Verdict accepted. Advancing to the next phase.' });
        setTimeout(() => {
          setFeedback(null);
          setVotes({}); 
          onLevelCleared(); 
        }, 2000);
      } else {
        const hintResult = await triggerPersonaHint(roomId);
        if (hintResult.isSuccess) {
          setFeedback({ type: 'error', message: hintResult.value.hint });
        } else {
          setFeedback({ type: 'error', message: 'The logic is flawed. Review the evidence.' });
        }
      }
    } else {
      setFeedback({ type: 'error', message: result.errorMessage });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="campaign-roadmap-container">
      <h2 className="section-title">Investigation Roadmap</h2>
      
      {feedback && (
        <div className="feedback-modal-overlay">
          <div className={`feedback-modal-content ${feedback.type}`}>
            <h3 className="feedback-title">
              {feedback.type === 'success' ? 'Consensus Verified' : 'Theory Rejected'}
            </h3>
            <p className="feedback-message">{feedback.message}</p>
            {feedback.type === 'error' && (
              <button className="btn-secondary mt-1" onClick={(e) => { e.stopPropagation(); setFeedback(null); }}>
                Reassess Evidence
              </button>
            )}
          </div>
        </div>
      )}

      <div className="roadmap-timeline">
        {sortedLevels.map((level, index) => {
          
          // 2. Safely override the status if the room is globally solved
          let status = 'locked';
          if (roomStatus === 'solved') {
            status = 'completed'; // If the case is closed, all unlocked levels are completed
          } else {
            if (level.order_index < currentLevelIndex) status = 'completed';
            if (level.id === currentLevelId) status = 'active';
          }

          const isLastNode = index === sortedLevels.length - 1;
          const lineStatus = level.order_index < currentLevelIndex ? 'active-line' : '';
          const isExpanded = expandedId === level.id;
          
          const allQuestionsAnswered = level.questions?.every(q => votes[q.id] !== undefined);

          return (
            <div key={level.id} className={`roadmap-node ${status}`}>
              {/* ... Rest of your node rendering remains exactly the same ... */}
              <div className="timeline-connector">
                <div className="node-indicator">
                  {status === 'completed' && '✓'}
                  {status === 'locked' && '🔒'}
                </div>
                {!isLastNode && <div className={`node-line ${lineStatus}`}></div>}
              </div>

              <div 
                className={`node-content glass-panel ${status !== 'locked' ? 'clickable' : ''}`}
                onClick={() => toggleExpand(level.id, status)}
              >
                <div className="node-main-card">
                  <div 
                    className="node-image"
                    style={{ backgroundImage: `url(${level.img_url || '/placeholder-crime-scene.jpg'})` }}
                  >
                    <div className="node-image-overlay"></div>
                  </div>
                  <div className="node-details">
                    <span className="node-phase">Phase {level.order_index}</span>
                    <h3 className="node-title">{level.title}</h3>
                    <p className="node-desc">{level.details}</p>
                    {status === 'active' && <div className="active-badge">Current Objective</div>}
                  </div>
                </div>

                {isExpanded && level.questions && (
                  <div className="node-questions-drawer">
                    <h4 className="drawer-title">Required Verdicts</h4>
                    <div className="questions-list">
                      {level.questions.map((q, qIdx) => (
                        <div key={q.id} className="question-item">
                          <span className="question-number">Q{qIdx + 1}</span>
                          <div className="question-body">
                            <p className="question-text">{q.text}</p>
                            <div className="choices-preview">
                              {q.choices?.map(c => {
                                const isSelected = votes[q.id] === c.id;
                                const isHistoricalCorrect = status === 'completed' && c.is_correct;
                                
                                let pillClass = 'choice-pill';
                                if (isSelected) pillClass += ' selected';
                                if (isHistoricalCorrect) pillClass += ' historical-correct';
                                if (status === 'active') pillClass += ' interactable';

                                return (
                                  <span 
                                    key={c.id} 
                                    className={pillClass}
                                    onClick={(e) => handleSelectChoice(e, q.id, c, status)}
                                  >
                                    {c.text}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {status === 'active' && (
                      <div className="submit-theory-container">
                        <button 
                          className="btn-primary submit-theory-btn"
                          disabled={!allQuestionsAnswered || isSubmitting}
                          onClick={handleSubmitTheory}
                        >
                          {isSubmitting ? 'Evaluating...' : 'Submit Theory'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}