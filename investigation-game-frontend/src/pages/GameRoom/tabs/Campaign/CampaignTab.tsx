import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Question, Phase, Level } from '@/types';
import InterrogationPhase from './Levels/Interrogation/InterrogationPhase';
import LocationPhase from './Levels/Location/LocationPhase';
import WiretapPhase from './Levels/Wiretap/WiretapPhase';
import CampaignMap from './CampaignMap';
import '../SharedOverlay.css';
import './CampaignTab.css';

export default function CampaignTab() {
  const { t } = useTranslation();
  const { room } = useRoomState();

  const phases: Phase[] = room.game_case?.phases || [];
  const currentLevelId = room.current_level_id;
  const roomStatus = room.status;

  const storedUser = localStorage.getItem('auth_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isHost = currentUser?.id === room.host_user_id;

  const {
    isSubmitting,
    isInitiating,
    handleSubmitTheory,
    initiatePhase,
  } = useInvestigationPhase();

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const unlockedLevelIds = new Set(room.unlocked_levels?.map((l: Level) => l.id) || []);
  const sortedPhases = [...phases].sort((a: Phase, b: Phase) => a.order_index - b.order_index);
  const phaseStorageKey = `room_${room.id}_active_phase`;

  // Auto-detect if there is an active phase in progress
  const hasActiveLevel = currentLevelId !== null && currentLevelId !== undefined;
  const activePhaseFromRoom = hasActiveLevel 
    ? sortedPhases.find(p => p.levels?.some(l => l.id === currentLevelId))
    : null;

  const [activePhaseId, setActivePhaseId] = useState<number | null>(() => {
    if (activePhaseFromRoom) return activePhaseFromRoom.id;
    try {
      const saved = sessionStorage.getItem(phaseStorageKey);
      if (saved) {
        const parsedId = parseInt(saved, 10);
        if (sortedPhases.some(p => p.id === parsedId)) return parsedId;
      }
    } catch { }
    return sortedPhases.length > 0 ? sortedPhases[0].id : null;
  });

  // Default to map ONLY if there is no active level and no session-saved phase
  const [isMapMode, setIsMapMode] = useState<boolean>(() => {
    if (hasActiveLevel) return false;
    return !sessionStorage.getItem(phaseStorageKey);
  });

  const toggleExpand = (levelId: number, status: string) => {
    if (status === 'locked') return;
    setExpandedId(expandedId === levelId ? null : levelId);
  };

  const handleEnterPhase = (phaseId: number) => {
    setActivePhaseId(phaseId);
    setExpandedId(null);
    setIsMapMode(false);
    sessionStorage.setItem(phaseStorageKey, phaseId.toString());
  };

  const handleReturnToMap = () => {
    setIsMapMode(true);
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

    let maxWeight = -1, isTie = false, winningChoiceId: number | null = null;
    for (const [cId, weight] of Object.entries(tally)) {
      if (weight > maxWeight) { maxWeight = weight; winningChoiceId = Number(cId); isTie = false; }
      else if (weight === maxWeight) { isTie = true; }
    }
    return { votesCast, isResolved: !isTie, isTie, winningChoiceId: isTie ? null : winningChoiceId };
  };

  const activePhaseData = sortedPhases.find((p: Phase) => p.id === activePhaseId);
  const sortedLevels = activePhaseData?.levels ? [...activePhaseData.levels].sort((a: Level, b: Level) => a.order_index - b.order_index) : [];

  return (
    <div className="campaign-roadmap-container">
      {isMapMode ? (
        <CampaignMap 
          onEnterPhase={handleEnterPhase} 
          phases={sortedPhases} 
          unlockedLevelIds={unlockedLevelIds}
        />
      ) : (
        <>
          <div className="phase-subnav" style={{ justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn-secondary" onClick={handleReturnToMap} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              &larr; {t('pages.gameRoom.campaign.map.backToMap')}
            </button>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              {t('pages.gameRoom.campaign.map.phaseIndex')} {activePhaseData?.order_index}
            </div>
          </div>

          <div style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <h2 className="section-title">{activePhaseData?.title || t('pages.gameRoom.campaign.unknownPhase')}</h2>
            {activePhaseData?.description && (
              <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {activePhaseData.description}
              </p>
            )}
          </div>

          <div className="roadmap-timeline">
            {sortedLevels.length === 0 && (
              <div className="terminal-text" style={{ padding: 0, textAlign: 'start' }}>
                {t('pages.gameRoom.campaign.noLeads')}
              </div>
            )}

            {sortedLevels.map((level: Level) => {
              const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
              const isCompleted = room.completed_levels?.some((cl: Level) => cl.id === level.id);
              const isActive = currentLevelId === level.id;
              const isAnotherPhaseRunning = currentLevelId !== null;

              let status = 'available';
              if (!isDiscovered) status = 'locked';
              else if (roomStatus === 'solved' || isCompleted) status = 'completed';
              else if (isActive) status = 'active';
              else if (isAnotherPhaseRunning) status = 'locked';

              const isExpanded = expandedId === level.id;

              const displayTitle = isDiscovered ? level.title : t('pages.gameRoom.campaign.undiscoveredEncounter');
              const displayDesc = isDiscovered
                ? level.details
                : t('pages.gameRoom.campaign.hiddenPathDesc');

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
                        <span className="node-phase">{t('pages.gameRoom.campaign.lead')} {level.order_index}</span>
                        <h3 className="node-title">{displayTitle}</h3>
                        <p className="node-desc">{displayDesc}</p>
                        {status === 'active' && <div className="active-badge">{t('pages.gameRoom.campaign.activeInvestigation')}</div>}
                      </div>
                    </div>

                    {isExpanded && isDiscovered && (
                      <div className="node-questions-drawer" onClick={(e) => e.stopPropagation()}>

                        {status === 'available' && (
                          <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
                              {isHost
                                ? t('pages.gameRoom.campaign.hostInitiateWarning')
                                : t('pages.gameRoom.campaign.awaitingHost')}
                            </p>
                            {isHost && (
                              <button className="btn-primary" onClick={() => initiatePhase(level.id)} disabled={isInitiating}>
                                {isInitiating ? t('pages.gameRoom.campaign.lockingCoordinator') : t('pages.gameRoom.campaign.commenceInvestigation')}
                              </button>
                            )}
                          </div>
                        )}

                        {(status === 'active' || status === 'completed') && level.questions && (
                          <>
                            {level.presentation_type === 'interrogation' ? (
                              <InterrogationPhase 
                                getQuestionConsensus={getQuestionConsensus} 
                                handleSubmitTheory={handleSubmitTheory} 
                                isHost={isHost} 
                                isSubmitting={isSubmitting} 
                                level={level} 
                                status={status} 
                                totalPlayers={totalPlayers} 
                              />
                            ) : level.presentation_type === 'location' ? (
                              <LocationPhase 
                                handleSubmitTheory={handleSubmitTheory} 
                                isHost={isHost} 
                                isSubmitting={isSubmitting} 
                                level={level} 
                                status={status} 
                              />
                            ) : level.presentation_type === 'wiretap' ? (
                              <WiretapPhase 
                                getQuestionConsensus={getQuestionConsensus} 
                                handleSubmitTheory={handleSubmitTheory} 
                                isHost={isHost} 
                                isSubmitting={isSubmitting} 
                                level={level} 
                                status={status} 
                                totalPlayers={totalPlayers} 
                              />
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}