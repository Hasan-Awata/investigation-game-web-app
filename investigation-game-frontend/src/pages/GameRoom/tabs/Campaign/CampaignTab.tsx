import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Question, Phase, Level } from '@/types';
import CampaignMap from './CampaignMap';
import LevelCard from './LevelCard'; // <-- Import your new component
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
    setExpandedId(null);
    localStorage.setItem(phaseStorageKey, phaseId.toString());
  };

  const handleReturnToMap = () => {
    if (hasActiveLevel) return;
    setUserSelectedPhaseId(null);
    localStorage.removeItem(phaseStorageKey);
  };

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
    <div className="campaign-tab-wrapper">
      {isMapMode ? (
        <CampaignMap
          onEnterPhase={handleEnterPhase}
          phases={sortedPhases}
          unlockedLevelIds={unlockedLevelIds}
        />
      ) : (
        <div className="campaign-roadmap-container">
          
          <div className="phase-header-container">
            <div className="phase-header-info">
              <h2 className="section-title tactical-glitch" data-text={activePhaseData?.title || t('pages.gameRoom.campaign.unknownPhase')}>
                {activePhaseData?.title || t('pages.gameRoom.campaign.unknownPhase')}
              </h2>
              {activePhaseData?.description && (
                <p className="phase-description">
                  {activePhaseData.description}
                </p>
              )}
            </div>
            
            <button
              className="btn-secondary return-to-map-btn hud-button"
              onClick={handleReturnToMap}
              disabled={hasActiveLevel}
              title={hasActiveLevel ? t('pages.gameRoom.campaign.map.finishLevelFirst') : ''}
            >
              <span className="hud-arrow">&larr;</span> {t('pages.gameRoom.campaign.map.backToMap')}
            </button>
          </div>

          <div className="roadmap-timeline">
            {sortedLevels.length === 0 && (
              <div className="terminal-text empty-leads">
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

              const displayTitle = isDiscovered ? level.title : t('pages.gameRoom.campaign.undiscoveredEncounter');
              const displayDesc = isDiscovered ? level.details : t('pages.gameRoom.campaign.hiddenPathDesc');

              return (
                <LevelCard
                  key={level.id}
                  level={level}
                  status={status}
                  isExpanded={expandedId === level.id}
                  isDiscovered={isDiscovered}
                  displayTitle={displayTitle}
                  displayDesc={displayDesc}
                  isHost={isHost}
                  isInitiating={isInitiating}
                  isSubmitting={isSubmitting}
                  totalPlayers={totalPlayers}
                  onToggleExpand={toggleExpand}
                  onInitiatePhase={initiatePhase}
                  getQuestionConsensus={getQuestionConsensus}
                  handleSubmitTheory={handleSubmitTheory}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}