import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData } from '@/context/RoomContext.shared';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Zone, Level } from '@/types';
import CampaignMap from './CampaignMap';
import LevelCard from './LevelCard';
import InterrogationPhase from './Levels/Interrogation/InterrogationPhase';
import LocationPhase from './Levels/Location/LocationPhase';
import '../SharedOverlay.css';
import campaignTab from './CampaignTab.module.css';
import levelCard from './LevelCard.module.css';

const CampaignTab = () => {
  const { t } = useTranslation();
  const { room } = useRoomData();
  const { activeGroup, isInitiating, isJoining, initiatePhase, joinGroup } = useInvestigationPhase();
  const zones: Zone[] = room.game_case?.zones ?? [];
  const sortedZones = useMemo(() => [...zones].sort((a, b) => a.order_index - b.order_index), [zones]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const unlockedIds = new Set(room.unlocked_levels?.map(level => level.id) ?? []);
  const activeLevel = activeGroup
    ? sortedZones.flatMap(zone => zone.levels ?? []).find(level => level.id === activeGroup.level_id) ?? null
    : null;
  const zone = activeGroup
    ? sortedZones.find(item => item.levels?.some(level => level.id === activeGroup.level_id)) ?? null
    : sortedZones.find(item => item.id === selectedZoneId) ?? null;
  const levels = zone?.levels?.slice().sort((a, b) => a.order_index - b.order_index) ?? [];
  const previewLevel = activeLevel ?? levels.find(level => level.id === selectedLevelId)
    ?? levels.find(level => level.is_initial || unlockedIds.has(level.id)) ?? levels[0] ?? null;
  const completedIds = new Set(room.completed_levels?.map(level => level.id) ?? []);
  const completedRequestIds = new Set((room.game_case?.investigation_requests ?? []).filter(request => {
    const requiredIds = request.required_evidences?.map(evidence => evidence.id).sort().join(',') ?? '';
    return room.filed_requests?.some(filed => filed.request_type === request.request_type && [...filed.evidence_ids].sort().join(',') === requiredIds);
  }).map(request => request.id));
  const isFree = !activeGroup;
  const isMapMode = isFree && selectedZoneId === null;
  const discovered = !!previewLevel && (previewLevel.is_initial || unlockedIds.has(previewLevel.id));
  const gated = !!previewLevel?.required_request_id && !completedRequestIds.has(previewLevel.required_request_id);
  const completed = !!previewLevel && completedIds.has(previewLevel.id);
  const isLocation = previewLevel?.presentation_type === 'location';
  const available = discovered && !gated && !completed && room.status === 'active';
  const joinableGroup = previewLevel && room.encounter_groups?.find(group => group.level_id === previewLevel.id && group.status === 'active');
  const isActiveLevel = !!activeGroup && previewLevel?.id === activeGroup.level_id;
  const [showInfo, setShowInfo] = useState(false);

  const returnToMap = () => {
    if (isFree) { setSelectedZoneId(null); setSelectedLevelId(null); }
  };

  return <div className={campaignTab['campaign-tab-wrapper']}>
    {isMapMode ? <CampaignMap zones={sortedZones} unlockedLevelIds={unlockedIds} onEnterZone={setSelectedZoneId} mapImageUrl={room.game_case?.map_url} /> : (
      <div className={campaignTab['campaign-roadmap-container']}>
        <div className={campaignTab['split-screen-layout']}>
          <div className={campaignTab['level-list-column']}>
            <div className={campaignTab['phase-info-sidebar']}>
              <h2 className={`${campaignTab['phase-sidebar-title']} tactical-glitch`} data-text={zone?.title ?? t('pages.gameRoom.campaign.unknownZone', 'UNKNOWN DISTRICT')}>{zone?.title ?? t('pages.gameRoom.campaign.unknownZone', 'UNKNOWN DISTRICT')}</h2>
              {zone?.description && <p className={campaignTab['phase-sidebar-desc']}>{zone.description}</p>}
            </div>
            {levels.map((level: Level) => {
              const isDiscovered = level.is_initial || unlockedIds.has(level.id);
              const isCompleted = completedIds.has(level.id);
              const isGated = isDiscovered && !!level.required_request_id && !completedRequestIds.has(level.required_request_id);
              const status: 'undiscovered' | 'gated' | 'actionable' | 'completed' = !isDiscovered ? 'undiscovered' : isGated ? 'gated' : isCompleted ? 'completed' : 'actionable';
              return <LevelCard key={level.id} level={level} status={status} isSelected={previewLevel?.id === level.id} displayTitle={isDiscovered ? level.title : t('pages.gameRoom.campaign.unknownLead', 'UNKNOWN LEAD')} onSelect={() => { if (isFree && isDiscovered) { setSelectedLevelId(level.id); setShowInfo(false); } }} />;
            })}
            <button type="button" className={`${campaignTab['return-map-card']} ${!isFree ? campaignTab['locked'] : ''}`} disabled={!isFree} onClick={returnToMap}>
              <div className={levelCard['list-item-content']}>
                <div className={`${levelCard['list-item-title-area']} ${campaignTab['map-return-area']}`}>
                  <span className={campaignTab['return-icon']}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </span>
                  <h4 className={levelCard['list-item-title']}>{t('pages.gameRoom.campaign.map.backToMap')}</h4>
                </div>
              </div>
            </button>
          </div>
          {previewLevel && <div className={campaignTab['preview-column']}>
            <div className={`${campaignTab['preview-bg-layer']} ${gated || showInfo ? campaignTab['blurred'] : ''}`} style={{ backgroundImage: `url(${discovered ? previewLevel.img_url || '/placeholder-crime-scene.jpg' : ''})` }} />
            <div className={campaignTab['top-right-actions']}>
              {isLocation && isFree && (
                <button 
                  type="button" 
                  className={campaignTab['swap-view-btn']} 
                  onClick={() => setShowInfo(value => !value)}
                  title={showInfo ? t('pages.gameRoom.campaign.showGameplay', 'Show workspace') : t('pages.gameRoom.campaign.showLevelInfo', 'Show details')}
                  aria-label={showInfo ? t('pages.gameRoom.campaign.showGameplay', 'Show workspace') : t('pages.gameRoom.campaign.showLevelInfo', 'Show details')}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 11 21 7 17 3"></polyline>
                    <line x1="21" y1="7" x2="9" y2="7"></line>
                    <polyline points="7 21 3 17 7 13"></polyline>
                    <line x1="3" y1="17" x2="15" y2="17"></line>
                  </svg>
                </button>
              )}
              {gated && <p className={campaignTab['host-warning-text']}>{t('pages.gameRoom.campaign.warrantRequired', 'PREREQUISITE REQUIRED')}</p>}
              {available && !isLocation && isFree && (joinableGroup
                ? <button type="button" className="btn-primary tactical-btn" disabled={isJoining} onClick={() => joinGroup(joinableGroup.id)}>{isJoining ? t('pages.gameRoom.campaign.joiningEncounter', 'Joining…') : t('pages.gameRoom.campaign.joinEncounter', 'Join encounter')}</button>
                : <button type="button" className="btn-primary tactical-btn" disabled={isInitiating} onClick={() => initiatePhase(previewLevel.id)}>{isInitiating ? t('pages.gameRoom.campaign.lockingCoordinator', 'Starting…') : t('pages.gameRoom.campaign.commenceInvestigation', 'Start interrogation')}</button>)}
            </div>
            <div className={campaignTab['preview-content-layer']}>
              {gated || showInfo || (!isActiveLevel && !isLocation) ? <div className={campaignTab['info-view']}><div className={campaignTab['preview-content-box']}><h3 className={campaignTab['preview-title']}>{discovered ? previewLevel.title : t('pages.gameRoom.campaign.unknownLead', 'UNKNOWN LEAD')}</h3><p className={campaignTab['preview-desc']}>{gated ? t('pages.gameRoom.campaign.gatedDesc', 'A required request has not been completed.') : previewLevel.details}</p></div></div> : (
                <div className={campaignTab['gameplay-view']}>
                  {previewLevel.presentation_type === 'interrogation' && isActiveLevel && <InterrogationPhase level={previewLevel} />}
                  {previewLevel.presentation_type === 'location' && isFree && !gated && <LocationPhase level={previewLevel} />}
                  {previewLevel.presentation_type === 'location' && !isFree && <p>{t('pages.gameRoom.campaign.activeEncounterLocked', 'Finish your active interrogation before entering a location.')}</p>}
                  {available && !isLocation && !isFree && <p>{t('pages.gameRoom.campaign.activeEncounterLocked', 'Finish your active interrogation before entering another level.')}</p>}
                  {completed && <p>{t('pages.gameRoom.campaign.levelCompleted', 'This interrogation is complete.')}</p>}
                </div>
              )}
            </div>
          </div>}
        </div>
      </div>
    )}
  </div>;
};

export default React.memo(CampaignTab);
