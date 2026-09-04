import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Question, Phase, Level } from '@/types';
import CampaignMap from './CampaignMap';
import LevelCard from './LevelCard';
import InterrogationPhase from './Levels/Interrogation/InterrogationPhase';
import LocationPhase from './Levels/Location/LocationPhase';
import WiretapPhase from './Levels/Wiretap/WiretapPhase';
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

  const phaseStorageKey = `room_${room.id}_active_phase`;
  const levelPreviewStorageKey = `room_${room.id}_active_level_preview`;

  const [selectedPreviewId, setSelectedPreviewId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(levelPreviewStorageKey);
      if (saved) {
        return parseInt(saved, 10);
      }
    } catch { }
    return null;
  });
  
  // Track the view state (info vs gameplay) per level for this specific player and room
  const viewStateKey = `room_${room.id}_level_view_prefs`;
  const [levelViewPrefs, setLevelViewPrefs] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(viewStateKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const unlockedLevelIds = new Set(room.unlocked_levels?.map((l: Level) => l.id) || []);
  const sortedPhases = [...phases].sort((a: Phase, b: Phase) => a.order_index - b.order_index);

  const hasActiveLevel = currentLevelId !== null && currentLevelId !== undefined;

  const activePhaseFromRoom = hasActiveLevel
    ? sortedPhases.find(p => p.levels?.some(l => l.id === currentLevelId))
    : null;

  const [userSelectedPhaseId, setUserSelectedPhaseId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(phaseStorageKey);
      if (saved) {
        const parsedId = parseInt(saved, 10);
        if (sortedPhases.some(p => p.id === parsedId)) return parsedId;
      }
    } catch { }
    return null;
  });

  const isMapMode = !hasActiveLevel && userSelectedPhaseId === null;

  const activePhaseId = hasActiveLevel && activePhaseFromRoom
    ? activePhaseFromRoom.id
    : userSelectedPhaseId ?? (sortedPhases.length > 0 ? sortedPhases[0].id : null);

  const handleEnterPhase = (phaseId: number) => {
    setUserSelectedPhaseId(phaseId);
    setSelectedPreviewId(null);
    localStorage.setItem(phaseStorageKey, phaseId.toString());
    localStorage.removeItem(levelPreviewStorageKey); // Clear level selection when switching phases
  };

  const handleReturnToMap = () => {
    if (hasActiveLevel) return;
    setUserSelectedPhaseId(null);
    localStorage.removeItem(phaseStorageKey);
    localStorage.removeItem(levelPreviewStorageKey); // Clear level selection when returning to map
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

  const initialPreviewLevel = sortedLevels.find(l => l.is_initial || unlockedLevelIds.has(l.id)) || sortedLevels[0];
  const activePreviewLevel = sortedLevels.find(l => l.id === selectedPreviewId) || initialPreviewLevel;
  const currentlyPlayingLevel = sortedLevels.find(l => l.id === currentLevelId);

  const displayLevel = hasActiveLevel ? currentlyPlayingLevel : activePreviewLevel;

  const isCurrentlyPlaying = hasActiveLevel && displayLevel?.id === currentLevelId;
  const isDisplayLevelCompleted = displayLevel && (room.completed_levels?.some((cl: Level) => cl.id === displayLevel.id) || roomStatus === 'solved');
  const displayLevelIsDiscovered = displayLevel && (displayLevel.is_initial || unlockedLevelIds.has(displayLevel.id));
  
  let previewStatus = 'available';
  if (!displayLevelIsDiscovered) previewStatus = 'locked';
  else if (isDisplayLevelCompleted) previewStatus = 'completed';

  const isInfoView = displayLevel ? !!levelViewPrefs[displayLevel.id] : false;
  const canSwap = isDisplayLevelCompleted && !isCurrentlyPlaying;
  const showGameplay = isCurrentlyPlaying || (isDisplayLevelCompleted && !isInfoView);

  const handleSelectLevel = (levelId: number) => {
    setSelectedPreviewId(levelId);
    localStorage.setItem(levelPreviewStorageKey, levelId.toString());
  };

  const toggleViewState = () => {
    if (displayLevel) {
      setLevelViewPrefs(prev => {
        const newState = { ...prev, [displayLevel.id]: !prev[displayLevel.id] };
        localStorage.setItem(viewStateKey, JSON.stringify(newState));
        return newState;
      });
    }
  };

  const phaseDescription = activePhaseData?.description || (activePhaseData as any)?.details;

  return (
    <div className="campaign-tab-wrapper">
      {isMapMode ? (
        <CampaignMap onEnterPhase={handleEnterPhase} phases={sortedPhases} unlockedLevelIds={unlockedLevelIds} />
      ) : (
        <div className="campaign-roadmap-container">
          <div className="split-screen-layout">
            {/* Left Column: Level List with Title at the top */}
            <div className="level-list-column">
              
              <div className="phase-info-sidebar">
                <h2 className="phase-sidebar-title tactical-glitch" data-text={activePhaseData?.title || t('pages.gameRoom.campaign.unknownPhase')}>
                  {activePhaseData?.title || t('pages.gameRoom.campaign.unknownPhase')}
                </h2>
                {phaseDescription && (
                  <p className="phase-sidebar-desc">{phaseDescription}</p>
                )}
              </div>

              {sortedLevels.length === 0 && (
                <div className="terminal-text empty-leads">{t('pages.gameRoom.campaign.noLeads')}</div>
              )}
              {sortedLevels.map((level: Level) => {
                const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
                const isCompleted = room.completed_levels?.some((cl: Level) => cl.id === level.id);
                
                let status = 'available';
                if (!isDiscovered) status = 'locked';
                else if (roomStatus === 'solved' || isCompleted) status = 'completed';

                if (hasActiveLevel && level.id !== currentLevelId) {
                  status = 'locked';
                }

                const displayTitle = isDiscovered ? level.title : t('pages.gameRoom.campaign.undiscoveredEncounter');

                return (
                  <LevelCard
                    key={level.id}
                    level={level}
                    status={status}
                    isSelected={displayLevel?.id === level.id}
                    displayTitle={displayTitle}
                    onSelect={() => {
                        if (status !== 'locked') handleSelectLevel(level.id);
                    }}
                  />
                );
              })}

              {/* Unique Return to Map Card */}
              <div 
                className={`return-map-card ${hasActiveLevel ? 'locked' : ''}`}
                onClick={() => {
                  if (!hasActiveLevel) handleReturnToMap();
                }}
              >
                <div className="list-item-content">
                  <div className="list-item-title-area map-return-area">
                    <span className="return-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
                      </svg>
                    </span>
                    <h4 className="list-item-title">{t('pages.gameRoom.campaign.map.backToMap')}</h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Active Preview / Gameplay */}
            {displayLevel && (
              <div className="preview-column">
                
                <div 
                  className={`preview-bg-layer ${showGameplay ? 'blurred' : ''}`} 
                  style={{ backgroundImage: `url(${displayLevelIsDiscovered ? (displayLevel.img_url || '/placeholder-crime-scene.jpg') : ''})` }}
                />
                
                <div className={`preview-overlay ${showGameplay ? 'hidden' : ''}`}></div>

                <div className="top-right-actions">
                  {canSwap && (
                    <button
                      className="swap-view-btn"
                      onClick={toggleViewState}
                      title={isInfoView ? t('pages.gameRoom.campaign.showGameplay', 'Show Gameplay') : t('pages.gameRoom.campaign.showLevelInfo', 'Show Level Info')}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
                      </svg>
                    </button>
                  )}

                  {previewStatus === 'available' && displayLevelIsDiscovered && !showGameplay && (
                    <>
                      <p className="host-warning-text">
                        {isHost ? t('pages.gameRoom.campaign.hostInitiateWarning') : t('pages.gameRoom.campaign.awaitingHost')}
                      </p>
                      {isHost && (
                        <button 
                          className="btn-primary tactical-btn start-btn-top" 
                          onClick={() => initiatePhase(displayLevel.id)} 
                          disabled={isInitiating}
                        >
                          {isInitiating ? t('pages.gameRoom.campaign.lockingCoordinator') : t('pages.gameRoom.campaign.commenceInvestigation')}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="preview-content-layer">
                  {!showGameplay ? (
                    <div className="info-view">
                      <div className="preview-content-box">
                        <h3 className="preview-title">
                          {displayLevelIsDiscovered ? displayLevel.title : t('pages.gameRoom.campaign.undiscoveredEncounter')}
                        </h3>
                        <p className="preview-desc">
                          {displayLevelIsDiscovered ? displayLevel.details : t('pages.gameRoom.campaign.hiddenPathDesc')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="gameplay-view">
                      {displayLevel.presentation_type === 'interrogation' ? (
                        <InterrogationPhase getQuestionConsensus={getQuestionConsensus} handleSubmitTheory={handleSubmitTheory} isHost={isHost} isSubmitting={isSubmitting} level={displayLevel} status={isCurrentlyPlaying ? 'active' : 'completed'} totalPlayers={totalPlayers} />
                      ) : displayLevel.presentation_type === 'location' ? (
                        <LocationPhase handleSubmitTheory={handleSubmitTheory} isHost={isHost} isSubmitting={isSubmitting} level={displayLevel} status={isCurrentlyPlaying ? 'active' : 'completed'} />
                      ) : displayLevel.presentation_type === 'wiretap' ? (
                        <WiretapPhase getQuestionConsensus={getQuestionConsensus} handleSubmitTheory={handleSubmitTheory} isHost={isHost} isSubmitting={isSubmitting} level={displayLevel} status={isCurrentlyPlaying ? 'active' : 'completed'} totalPlayers={totalPlayers} />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}