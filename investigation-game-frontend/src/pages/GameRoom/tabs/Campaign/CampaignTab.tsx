import { useState } from 'react';
import { useRoomContext } from '../../../../context/RoomContext';
import { useInvestigationPhase } from '../../../../hooks/useInvestigationPhase';
import type { Question } from '../../../../types';
import InterrogationPhase from './Levels/InterrogationPhase';
import StandardPhase from './Levels/StandardPhase'; 
import LocationPhase from './Levels/LocationPhase';
import '../SharedOverlay.css';
import './CampaignTab.css';

export default function CampaignTab() {
  const { room, refreshRoomData } = useRoomContext();
  
  const levels = room.game_case?.levels || [];
  const currentLevelId = room.current_level_id;
  const roomStatus = room.status;

  const storedUser = localStorage.getItem('auth_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isHost = currentUser?.id === room.host_user_id;

  const {
    localVotes,
    isSubmitting,
    isInitiating,
    feedback,
    toasts, 
    handleSelectChoice,
    handleSubmitTheory,
    initiatePhase,
    clearFeedback
  } = useInvestigationPhase(room, refreshRoomData);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  // --- NARRATIVE VISIBILITY MASKING ---
  const unlockedLevelIds = new Set(room.unlocked_levels?.map(l => l.id) || []);
  const sortedLevels = [...levels].sort((a, b) => a.order_index - b.order_index);

  const toggleExpand = (levelId: number, status: string) => {
    if (status === 'locked') return; 
    setExpandedId(expandedId === levelId ? null : levelId);
  };

  // --- UPGRADED GLOBAL CONSENSUS ENGINE ---
  const totalPlayers = room.users?.length || 1; 

  const getQuestionConsensus = (question: Question) => {
    const tally: Record<number, number> = {};
    let votesCast = 0;
    const participants = room.users || [];

    room.votes?.forEach(v => {
      if (v.question_id === question.id) {
        const role = participants.find(p => p.user_id === v.user_id)?.role || 'participant';
        const weight = role === 'host' ? 2 : 1; // Host vote carries double weight
        tally[v.choice_id] = (tally[v.choice_id] || 0) + weight;
        votesCast++;
      }
    });

    // LOCATION PHASE EXCEPTION: Only requires the assigned user's vote
    if (question.assigned_user_id !== undefined && question.assigned_user_id !== null) {
      const assignedVote = room.votes?.find(v => v.question_id === question.id && v.user_id === question.assigned_user_id);
      return {
        votesCast,
        isResolved: !!assignedVote,
        isTie: false,
        winningChoiceId: assignedVote ? assignedVote.choice_id : null
      };
    }

    if (votesCast < totalPlayers) {
      return { votesCast, isResolved: false, isTie: false, winningChoiceId: null };
    }

    // Everyone voted. Check if it's a tie or a clear victory.
    let maxWeight = -1;
    let isTie = false;
    let winningChoiceId = null;

    for (const [cId, weight] of Object.entries(tally)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        winningChoiceId = Number(cId);
        isTie = false;
      } else if (weight === maxWeight) {
        isTie = true;
      }
    }

    return {
      votesCast,
      isResolved: !isTie, // It is ONLY resolved if everyone voted AND there's no tie
      isTie,
      winningChoiceId: isTie ? null : winningChoiceId
    };
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
                <svg className="persona-silhouette" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
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
              <button className="btn-secondary mt-1" onClick={clearFeedback}>Reassess Evidence</button>
            )}
          </div>
        </div>
      )}

      {/* --- TACTICAL TOAST NOTIFICATIONS --- */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="system-toast-notification">
            <div className="toast-icon pulse-icon">
              <img src={toast.icon} alt={toast.type} className="toast-svg-graphic" />
            </div>
            <div className="toast-text-block">
              <span className="toast-header">{toast.title}</span>
              <p className="toast-message">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- NON-LINEAR ROADMAP --- */}
      <div className="roadmap-timeline">
        {sortedLevels.map((level) => {
          // 1. Determine if the level is even discovered yet
          const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
          
          // 2. State Machine
          const isCompleted = room.completed_levels?.some(cl => cl.id === level.id);
          const isActive = currentLevelId === level.id;
          const isAnotherPhaseRunning = currentLevelId !== null;

          let status = 'available';
          if (!isDiscovered) {
            status = 'locked'; // Undiscovered levels are strictly locked
          } else if (roomStatus === 'solved' || isCompleted) {
            status = 'completed'; 
          } else if (isActive) {
            status = 'active';
          } else if (isAnotherPhaseRunning) {
            status = 'locked'; 
          }

          const isExpanded = expandedId === level.id;
          const mandatoryQuestions = level.questions?.filter(q => q.is_mandatory) || [];
          
          // Button is only enabled when every mandatory question is fully resolved (no ties)
          const allMandatoryAnswered = mandatoryQuestions.every(q => getQuestionConsensus(q).isResolved);

          // 3. UI Content Masking
          const displayTitle = isDiscovered ? level.title : 'Encounter Undiscovered';
          const displayDesc = isDiscovered ? level.details : 'This path remains hidden. You must deduce the correct narrative link in an available phase to unlock this lead.';
          const displayPhase = isDiscovered ? `Phase ${level.order_index}` : 'Unknown Phase';

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
                  <div className="node-image" style={{ backgroundImage: `url(${level.img_url || '/placeholder-crime-scene.jpg'})` }}>
                    <div className="node-image-overlay"></div>
                  </div>
                  <div className="node-details">
                    <span className="node-phase">{displayPhase}</span>
                    <h3 className="node-title">{displayTitle}</h3>
                    <p className="node-desc">{displayDesc}</p>
                    {status === 'active' && <div className="active-badge">Active Investigation</div>}
                  </div>
                </div>

                {isExpanded && isDiscovered && (
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
                          <button className="btn-primary" onClick={() => initiatePhase(level.id)} disabled={isInitiating}>
                            {isInitiating ? 'Locking Coordinator...' : 'Commence Investigation'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* DYNAMIC PRESENTATION ROUTER */}
                    {(status === 'active' || status === 'completed') && level.questions && (
                      <>
                        {level.presentation_type === 'interrogation' ? (
                          <InterrogationPhase 
                            level={level} status={status} localVotes={localVotes} 
                            totalPlayers={totalPlayers} getQuestionConsensus={getQuestionConsensus} 
                            handleSelectChoice={handleSelectChoice}
                          />
                        ) : level.presentation_type === 'location' ? (
                          <LocationPhase 
                            level={level} status={status} localVotes={localVotes} 
                            handleSelectChoice={handleSelectChoice} currentUserId={currentUser.id}
                          />
                        ) : (
                          <StandardPhase 
                            level={level} status={status} localVotes={localVotes} 
                            totalPlayers={totalPlayers} getQuestionConsensus={getQuestionConsensus} 
                            handleSelectChoice={handleSelectChoice}
                          />
                        )}

                        {/* UNIVERSAL SUBMIT BUTTON */}
                        {status === 'active' && (
                          <div className="submit-theory-container">
                            <button 
                              className="btn-primary submit-theory-btn"
                              disabled={
                                isSubmitting || 
                                (level.presentation_type !== 'location' && !allMandatoryAnswered)
                              }
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