import { useState } from 'react';
import { useRoomContext } from '../../../context/RoomContext';
import { useInvestigationPhase } from '../../../hooks/useInvestigationPhase';
import './Tabs.css';

export default function CampaignTab() {
  const { room, refreshRoomData } = useRoomContext();
  
  const levels = room.game_case?.levels || [];
  const currentLevelId = room.current_level_id;
  const roomId = room.id;
  const roomStatus = room.status;

  // Identify if the current client is the host
  const storedUser = localStorage.getItem('auth_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isHost = currentUser?.id === room.host_user_id;

  const {
    votes,
    isSubmitting,
    isInitiating,
    feedback,
    toastMessage, 
    handleSelectChoice,
    handleSubmitTheory,
    initiatePhase,
    clearFeedback
  } = useInvestigationPhase(roomId, refreshRoomData);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Sorting strictly for visual UI grouping, not for gating logic
  const sortedLevels = [...levels].sort((a, b) => a.order_index - b.order_index);

  const toggleExpand = (levelId: number, status: string) => {
    if (status === 'locked') return; 
    setExpandedId(expandedId === levelId ? null : levelId);
  };

  return (
    <div className="campaign-roadmap-container">
      <h2 className="section-title">Investigation Phases</h2>
      
      {/* --- FEEDBACK MODAL (PERSONA INTERCEPT) --- */}
      {feedback && (
        <div className="feedback-modal-overlay">
          <div className={`feedback-modal-content ${feedback.type}`}>
            {feedback.type === 'error' && (
              <div className="persona-container">
                <svg 
                  className="persona-silhouette" 
                  viewBox="0 0 256 256" 
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                >
                  <path d="M100 50 C100 20, 156 20, 156 50 L160 80 L96 80 Z" />
                  <ellipse cx="128" cy="85" rx="70" ry="12" />
                  <path d="M105 100 L151 100 C151 125, 138 145, 128 145 C118 145, 105 125, 105 100 Z" />
                  <path d="M128 135 C80 135, 40 190, 20 256 L236 256 C216 190, 176 135, 128 135 Z" />
                </svg>
              </div>
            )}
            <h3 className="feedback-title">
              {feedback.type === 'success' ? 'Consensus Verified' : 'Theory Rejected'}
            </h3>
            <p className="feedback-message">{feedback.message}</p>
            {feedback.type === 'error' && (
              <button className="btn-secondary mt-1" onClick={clearFeedback}>
                Reassess Evidence
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- TACTICAL TOAST NOTIFICATION --- */}
      {toastMessage && (
        <div className="system-toast-notification">
          <span className="toast-icon pulse-icon">📄</span>
          <div className="toast-text-block">
            <span className="toast-header">INTEL ACQUIRED</span>
            <p className="toast-message">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* --- NON-LINEAR ROADMAP --- */}
      <div className="roadmap-timeline">
        {sortedLevels.map((level) => {
          
          // CLEAN ARCHITECTURE: Pure State Machine
          const isCompleted = room.completed_levels?.some(cl => cl.id === level.id);
          const isActive = currentLevelId === level.id;
          const isAnotherPhaseRunning = currentLevelId !== null;

          let status = 'available';
          if (roomStatus === 'solved' || isCompleted) {
            status = 'completed'; 
          } else if (isActive) {
            status = 'active';
          } else if (isAnotherPhaseRunning) {
            status = 'locked'; 
          }

          const isExpanded = expandedId === level.id;
          const mandatoryQuestions = level.questions?.filter(q => q.is_mandatory) || [];
          const allMandatoryAnswered = mandatoryQuestions.every(q => votes[q.id] !== undefined);

          return (
            <div key={level.id} className={`roadmap-node ${status}`}>
              
              <div className="timeline-connector">
                <div className="node-indicator">
                  {status === 'completed' && '✓'}
                  {status === 'locked' && '🔒'}
                </div>
                <div className="node-line"></div>
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
                    {status === 'active' && <div className="active-badge">Active Investigation</div>}
                  </div>
                </div>

                {isExpanded && (
                  <div className="node-questions-drawer" onClick={(e) => e.stopPropagation()}>
                    
                    {/* INITIATION BLOCK */}
                    {status === 'available' && (
                      <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
                          {isHost 
                            ? 'Initiating this phase will lock all other phases until a verdict is reached.' 
                            : 'Awaiting Host authorization to commence this investigation phase.'}
                        </p>
                        {isHost && (
                          <button 
                            className="btn-primary" 
                            onClick={() => initiatePhase(level.id)}
                            disabled={isInitiating}
                          >
                            {isInitiating ? 'Locking Coordinator...' : 'Commence Investigation'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* QUESTIONS BLOCK: Rendered when active or completed */}
                    {(status === 'active' || status === 'completed') && level.questions && (
                      <>
                        <h4 className="drawer-title">Required Verdicts</h4>
                        <div className="questions-list">
                          {level.questions.map((q, qIdx) => {
                            
                            const isVisible = 
                              status === 'completed' || 
                              qIdx === 0 || 
                              votes[level.questions![qIdx - 1].id] !== undefined;

                            if (!isVisible) return null;

                            // NEW: Check if this is the only question in the phase
                            const isSingleQuestionLevel = level.questions!.length === 1;

                            return (
                              <div 
                                key={q.id} 
                                className="question-item" 
                                style={{ animation: 'fadeIn 0.4s ease-out forwards' }} 
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span className="question-number">Q{qIdx + 1}</span>
                                  {!q.is_mandatory && (
                                    <span 
                                      title="This question provides additional narrative evidence." 
                                      style={{ 
                                        color: 'var(--accent-amber)', 
                                        marginTop: '0.35rem', 
                                        fontSize: '1.1rem', 
                                        cursor: 'help', 
                                        animation: 'pulse-icon 2s infinite' 
                                      }}
                                    >
                                      📄
                                    </span>
                                  )}
                                </div>

                                <div className="question-body">
                                  <p className="question-text">{q.text}</p>
                                  <div className="choices-preview">
                                    {q.choices?.map(c => {
                                      const isSelected = votes[q.id] === c.id;
                                      const isHistoricalCorrect = status === 'completed' && c.is_correct;
                                      
                                      const isQuestionAnswered = votes[q.id] !== undefined;
                                      
                                      // UX LOGIC: Only lock if answered AND there are multiple questions
                                      const isLocked = isQuestionAnswered && !isSingleQuestionLevel;
                                      
                                      let pillClass = 'choice-pill';
                                      if (isSelected) pillClass += ' selected';
                                      if (isHistoricalCorrect) pillClass += ' historical-correct';
                                      
                                      // Apply interactable styling if not locked
                                      if (status === 'active' && !isLocked) {
                                        pillClass += ' interactable';
                                      }

                                      return (
                                        <span 
                                          key={c.id} 
                                          className={pillClass}
                                          onClick={(e) => {
                                            // Enforce the click lock
                                            if (status === 'active' && !isLocked) {
                                              handleSelectChoice(e, q.id, c, status);
                                            }
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

                        {status === 'active' && (
                          <div className="submit-theory-container">
                            <button 
                              className="btn-primary submit-theory-btn"
                              disabled={!allMandatoryAnswered || isSubmitting}
                              onClick={handleSubmitTheory}
                            >
                              {isSubmitting ? 'Evaluating...' : 'Submit Theory'}
                            </button>
                          </div>
                        )}
                      </>
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