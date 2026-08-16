import { useState } from 'react';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Question } from '@/types';
import InterrogationPhase from './Levels/Interrogation/InterrogationPhase';
import LocationPhase from './Levels/LocationPhase';
import WiretapPhase from './Levels/WiretapPhase';
import '../SharedOverlay.css';
import './CampaignTab.css';

export default function CampaignTab() {
  const { room } = useRoomState();
  
  const phases = room.game_case?.phases || [];
  const currentLevelId = room.current_level_id;
  const roomStatus = room.status;

  const storedUser = localStorage.getItem('auth_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isHost = currentUser?.id === room.host_user_id;

  // Feedback and clearFeedback have been removed; UI logic now lives in the parent layout
  const {
    isSubmitting,
    isInitiating,
    handleSubmitTheory,
    initiatePhase,
  } = useInvestigationPhase();

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const unlockedLevelIds = new Set(room.unlocked_levels?.map((l: any) => l.id) || []);
  const sortedPhases = [...phases].sort((a: any, b: any) => a.order_index - b.order_index);
  const phaseStorageKey = `room_${room.id}_active_phase`;

  const [activePhaseId, setActivePhaseId] = useState<number | null>(() => {
    try {
      const saved = sessionStorage.getItem(phaseStorageKey);
      if (saved) {
        const parsedId = parseInt(saved, 10);
        if (sortedPhases.some(p => p.id === parsedId)) return parsedId;
      }
    } catch { }
    return sortedPhases.length > 0 ? sortedPhases[0].id : null;
  });

  const toggleExpand = (levelId: number, status: string) => {
    if (status === 'locked') return; 
    setExpandedId(expandedId === levelId ? null : levelId);
  };

  const totalPlayers = room.users?.length || 1; 

  const getQuestionConsensus = (question: Question) => {
    const tally: Record<number, number> = {};
    let votesCast = 0;
    const participants = room.users || [];

    room.votes?.forEach((v: any) => {
      if (v.question_id === question.id) {
        const role = participants.find((p: any) => p.user_id === v.user_id)?.role || 'participant';
        const weight = role === 'host' ? 2 : 1; 
        tally[v.choice_id] = (tally[v.choice_id] || 0) + weight;
        votesCast++;
      }
    });

    if (question.assigned_user_id !== undefined && question.assigned_user_id !== null) {
      const assignedVote = room.votes?.find((v: any) => v.question_id === question.id && v.user_id === question.assigned_user_id);
      return { votesCast, isResolved: !!assignedVote, isTie: false, winningChoiceId: assignedVote ? assignedVote.choice_id : null };
    }

    if (votesCast < totalPlayers) return { votesCast, isResolved: false, isTie: false, winningChoiceId: null };

    let maxWeight = -1, isTie = false, winningChoiceId = null;
    for (const [cId, weight] of Object.entries(tally)) {
      if (weight > maxWeight) { maxWeight = weight; winningChoiceId = Number(cId); isTie = false; } 
      else if (weight === maxWeight) { isTie = true; }
    }
    return { votesCast, isResolved: !isTie, isTie, winningChoiceId: isTie ? null : winningChoiceId };
  };

  const activePhaseData = sortedPhases.find((p: any) => p.id === activePhaseId);
  const sortedLevels = activePhaseData?.levels ? [...activePhaseData.levels].sort((a: any, b: any) => a.order_index - b.order_index) : [];

  return (
    <div className="campaign-roadmap-container">
      <div className="phase-subnav">
        {sortedPhases.map((phase: any) => {
          const isPhaseUnlocked = phase.levels?.some((l: any) => l.is_initial || unlockedLevelIds.has(l.id));

          return (
            <button
              key={phase.id}
              className={`phase-subnav-btn ${activePhaseId === phase.id ? 'active' : ''}`}
              disabled={!isPhaseUnlocked}
              onClick={() => { 
                setActivePhaseId(phase.id); 
                setExpandedId(null); 
                sessionStorage.setItem(phaseStorageKey, phase.id.toString());
              }}
            >
              {!isPhaseUnlocked && <span className="phase-lock-icon">🔒</span>}
              {phase.title}
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 className="section-title">{activePhaseData?.title || 'Unknown Phase'}</h2>
        {activePhaseData?.description && (
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            {activePhaseData.description}
          </p>
        )}
      </div>

      <div className="roadmap-timeline">
        {sortedLevels.length === 0 && (
          <div className="terminal-text" style={{ padding: 0, textAlign: 'left' }}>No leads currently available in this phase.</div>
        )}
        
        {sortedLevels.map((level: any) => {
          const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
          const isCompleted = room.completed_levels?.some((cl: any) => cl.id === level.id);
          const isActive = currentLevelId === level.id;
          const isAnotherPhaseRunning = currentLevelId !== null;

          let status = 'available';
          if (!isDiscovered) status = 'locked'; 
          else if (roomStatus === 'solved' || isCompleted) status = 'completed'; 
          else if (isActive) status = 'active';
          else if (isAnotherPhaseRunning) status = 'locked'; 

          const isExpanded = expandedId === level.id;

          const displayTitle = isDiscovered ? level.title : 'Undiscovered Encounter';
          const displayDesc = isDiscovered 
            ? level.details 
            : 'This path remains hidden. You must deduce the correct narrative link or locate specific evidence to unlock this lead.';

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
                    <span className="node-phase">Lead {level.order_index}</span>
                    <h3 className="node-title">{displayTitle}</h3>
                    <p className="node-desc">{displayDesc}</p>
                    {status === 'active' && <div className="active-badge">Active Investigation</div>}
                  </div>
                </div>

                {isExpanded && isDiscovered && (
                  <div className="node-questions-drawer" onClick={(e) => e.stopPropagation()}>
                    
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

                    {(status === 'active' || status === 'completed') && level.questions && (
                      <>
                        {level.presentation_type === 'interrogation' ? (
                          <InterrogationPhase 
                            level={level} 
                            status={status} 
                            totalPlayers={totalPlayers} 
                            getQuestionConsensus={getQuestionConsensus} 
                            isHost={isHost}
                            isSubmitting={isSubmitting}
                            handleSubmitTheory={handleSubmitTheory}
                          />
                        ) : level.presentation_type === 'location' ? (
                          <LocationPhase level={level} status={status} />
                        ) : level.presentation_type === 'wiretap' ? (
                          <WiretapPhase level={level} status={status} totalPlayers={totalPlayers} getQuestionConsensus={getQuestionConsensus} />
                        ) : null}

                        {status === 'active' && level.presentation_type !== 'interrogation' && (
                          <div className="submit-theory-container">
                            {isHost ? (
                              <button 
                                className="btn-primary submit-theory-btn"
                                disabled={isSubmitting}
                                onClick={handleSubmitTheory}
                              >
                                {isSubmitting 
                                  ? 'Processing...' 
                                  : level.presentation_type === 'location' 
                                    ? 'Conclude Scene Sweep' 
                                    : 'Submit Final Verdict'
                                }
                              </button>
                            ) : (
                              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}>
                                {level.presentation_type === 'location'
                                  ? 'Sweep in progress. Awaiting Host to conclude the search...'
                                  : 'Awaiting Host to submit final verdict...'
                                }
                              </div>
                            )}
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