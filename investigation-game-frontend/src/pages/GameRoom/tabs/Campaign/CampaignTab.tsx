import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Question, Zone, Level } from '@/types';
import CampaignMap from './CampaignMap';
import LevelCard from './LevelCard';
import InterrogationPhase from './Levels/Interrogation/InterrogationPhase';
import LocationPhase from './Levels/Location/LocationPhase';
import WiretapPhase from './Levels/Wiretap/WiretapPhase';
import '../SharedOverlay.css';
import './CampaignTab.css';

const CampaignTab = () => {
  const { t } = useTranslation();
  const { room } = useRoomState();

  const zones: Zone[] = room.game_case?.zones || [];
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

  const zoneStorageKey = `room_${room.id}_active_zone`;
  const levelPreviewStorageKey = `room_${room.id}_active_level_preview`;

  const [selectedPreviewId, setSelectedPreviewId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(levelPreviewStorageKey);
      if (saved) return parseInt(saved, 10);
    } catch { }
    return null;
  });
  
  const viewStateKey = `room_${room.id}_level_view_prefs`;
  const [levelViewPrefs, setLevelViewPrefs] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(viewStateKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const unlockedLevelIds = new Set(room.unlocked_levels?.map((l: Level) => l.id) || []);
  
  // DEDUCE COMPLETED REQUESTS: Cross-reference the filed action log against the strict case requirements
  const completedRequestIds = new Set(
    room.game_case?.investigation_requests
      ?.filter(req => {
        const requiredEvIds = req.required_evidences?.map(e => e.id).sort().join(',') || '';
        return room.filed_requests?.some(
          fr => fr.request_type === req.request_type && [...fr.evidence_ids].sort().join(',') === requiredEvIds
        );
      })
      .map(req => req.id) || []
  );

  const sortedZones = [...zones].sort((a: Zone, b: Zone) => a.order_index - b.order_index);
  const hasActiveLevel = currentLevelId !== null && currentLevelId !== undefined;

  const activeZoneFromRoom = hasActiveLevel
    ? sortedZones.find(z => z.levels?.some(l => l.id === currentLevelId))
    : null;

  const [userSelectedZoneId, setUserSelectedZoneId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(zoneStorageKey);
      if (saved) {
        const parsedId = parseInt(saved, 10);
        if (sortedZones.some(z => z.id === parsedId)) return parsedId;
      }
    } catch { }
    return null;
  });

  const isMapMode = !hasActiveLevel && userSelectedZoneId === null;

  const activeZoneId = hasActiveLevel && activeZoneFromRoom
    ? activeZoneFromRoom.id
    : userSelectedZoneId ?? (sortedZones.length > 0 ? sortedZones[0].id : null);

  const handleEnterZone = (zoneId: number) => {
    setUserSelectedZoneId(zoneId);
    setSelectedPreviewId(null);
    localStorage.setItem(zoneStorageKey, zoneId.toString());
    localStorage.removeItem(levelPreviewStorageKey);
  };

  const handleReturnToMap = () => {
    if (hasActiveLevel) return;
    setUserSelectedZoneId(null);
    localStorage.removeItem(zoneStorageKey);
    localStorage.removeItem(levelPreviewStorageKey);
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

  const activeZoneData = sortedZones.find((z: Zone) => z.id === activeZoneId);
  const sortedLevels = activeZoneData?.levels ? [...activeZoneData.levels].sort((a: Level, b: Level) => a.order_index - b.order_index) : [];

  const initialPreviewLevel = sortedLevels.find(l => l.is_initial || unlockedLevelIds.has(l.id)) || sortedLevels[0];
  const activePreviewLevel = sortedLevels.find(l => l.id === selectedPreviewId) || initialPreviewLevel;
  const currentlyPlayingLevel = sortedLevels.find(l => l.id === currentLevelId);

  const displayLevel = hasActiveLevel ? currentlyPlayingLevel : activePreviewLevel;

  const isCurrentlyPlaying = hasActiveLevel && displayLevel?.id === currentLevelId;
  const isDisplayLevelCompleted = displayLevel && (room.completed_levels?.some((cl: Level) => cl.id === displayLevel.id) || roomStatus === 'solved');
  const displayLevelIsDiscovered = displayLevel && (displayLevel.is_initial || unlockedLevelIds.has(displayLevel.id));
  const isLocationSandbox = displayLevel?.presentation_type === 'location';
  const displayLevelIsGated = displayLevelIsDiscovered && !isDisplayLevelCompleted && displayLevel?.required_request_id && !completedRequestIds.has(displayLevel.required_request_id);

  let previewStatus = 'undiscovered';
  if (isDisplayLevelCompleted || roomStatus === 'solved') previewStatus = 'completed';
  else if (displayLevelIsGated) previewStatus = 'gated';
  else if (displayLevelIsDiscovered) previewStatus = 'actionable';

  const isInfoView = displayLevel ? !!levelViewPrefs[displayLevel.id] : false;
  const canSwap = (isDisplayLevelCompleted && !isCurrentlyPlaying) || isLocationSandbox;
  const showGameplay = isLocationSandbox 
    ? !isInfoView 
    : isCurrentlyPlaying || (isDisplayLevelCompleted && !isInfoView);

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

  const zoneDescription = activeZoneData?.description;

  return (
    <div className="campaign-tab-wrapper">
      {isMapMode ? (
        <CampaignMap
          onEnterZone={handleEnterZone}
          zones={sortedZones}
          unlockedLevelIds={unlockedLevelIds}
          mapImageUrl={room.game_case?.map_url} 
        />
      ) : (
        <div className="campaign-roadmap-container">
          <div className="split-screen-layout">
            <div className="level-list-column">
              
              <div className="phase-info-sidebar">
                <h2 className="phase-sidebar-title tactical-glitch" data-text={activeZoneData?.title || t('pages.gameRoom.campaign.unknownZone', 'UNKNOWN DISTRICT')}>
                  {activeZoneData?.title || t('pages.gameRoom.campaign.unknownZone', 'UNKNOWN DISTRICT')}
                </h2>
                {zoneDescription && (
                  <p className="phase-sidebar-desc">{zoneDescription}</p>
                )}
              </div>

              {sortedLevels.length === 0 && (
                <div className="terminal-text empty-leads">{t('pages.gameRoom.campaign.noLeads')}</div>
              )}
              {sortedLevels.map((level: Level) => {
                const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
                const isCompleted = room.completed_levels?.some((cl: Level) => cl.id === level.id);
                const isGated = isDiscovered && !isCompleted && level.required_request_id && !completedRequestIds.has(level.required_request_id);
                
                let status: 'undiscovered' | 'gated' | 'actionable' | 'completed' = 'undiscovered';
                if (isCompleted || roomStatus === 'solved') status = 'completed';
                else if (isGated) status = 'gated';
                else if (isDiscovered) status = 'actionable';

                if (hasActiveLevel && level.id !== currentLevelId) {
                  status = status === 'gated' ? 'gated' : 'undiscovered'; // Lock visual out
                }

                const displayTitle = isDiscovered ? level.title : t('pages.gameRoom.campaign.unknownLead', 'UNKNOWN LEAD');

                return (
                  <LevelCard
                    key={level.id}
                    level={level}
                    status={status}
                    isSelected={displayLevel?.id === level.id}
                    displayTitle={displayTitle}
                    onSelect={() => {
                        if (status !== 'undiscovered') handleSelectLevel(level.id);
                    }}
                  />
                );
              })}

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

            {displayLevel && (
              <div className="preview-column">
                
                <div 
                  className={`preview-bg-layer ${showGameplay || previewStatus === 'gated' ? 'blurred' : ''}`} 
                  style={{ 
                    backgroundImage: `url(${displayLevelIsDiscovered ? (displayLevel.img_url || '/placeholder-crime-scene.jpg') : ''})`,
                    filter: previewStatus === 'gated' ? 'grayscale(100%) blur(12px) brightness(0.2)' : undefined
                  }}
                />
                
                <div className={`preview-overlay ${(showGameplay || previewStatus === 'gated') ? 'hidden' : ''}`}></div>

                <div className="top-right-actions">
                  {canSwap && previewStatus !== 'gated' && (
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

                  {previewStatus === 'gated' && (
                    <p className="host-warning-text" style={{ color: 'var(--accent-crimson)', borderColor: 'rgba(163, 50, 50, 0.4)' }}>
                      {t('pages.gameRoom.campaign.warrantRequired', 'WARRANT REQUIRED')}
                    </p>
                  )}

                  {previewStatus === 'actionable' && !showGameplay && !isLocationSandbox && (
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
                  {previewStatus === 'gated' ? (
                    <div className="info-view">
                      <div className="preview-content-box">
                        <h3 className="preview-title" style={{ color: 'var(--text-secondary)' }}>
                          {displayLevel.title}
                        </h3>
                        <p className="preview-desc" style={{ color: 'var(--text-secondary)' }}>
                          {t('pages.gameRoom.campaign.gatedDesc', 'This location or subject is currently restricted. You must file the correct procedural request with the DA to proceed.')}
                        </p>
                      </div>
                    </div>
                  ) : !showGameplay ? (
                    <div className="info-view">
                      <div className="preview-content-box">
                        <h3 className="preview-title">
                          {displayLevelIsDiscovered ? displayLevel.title : t('pages.gameRoom.campaign.unknownLead', 'UNKNOWN LEAD')}
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
                        <LocationPhase level={displayLevel} isHost={isHost} />
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

export default React.memo(CampaignTab);