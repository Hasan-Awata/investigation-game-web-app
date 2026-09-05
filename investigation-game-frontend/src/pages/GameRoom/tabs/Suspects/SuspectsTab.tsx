import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState, useRoomActions } from '../../../../context/RoomContext';
import { submitSuspectVerdict } from '../../../../services/api';
import { useMutation } from '@tanstack/react-query';
import SuspectCard from './SuspectCard';
import './SuspectsTab.css';

type PoolType = 'unassigned' | 'guilty' | 'innocent';

export default function SuspectsTab() {
  const { t } = useTranslation();
  const { room, accumulatedSuspects, viewedSuspects } = useRoomState();
  const { refreshRoomData, markSuspectAsViewed, setGameOverData } = useRoomActions();

  const [guiltyIds, setGuiltyIds] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem(`room_${room.invite_code}_guilty_suspects`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [innocentIds, setInnocentIds] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem(`room_${room.invite_code}_innocent_suspects`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const initialLevels = room.game_case?.phases?.flatMap(p => p.levels || []).filter(l => l.is_initial) || [];
  const completedLevelIds = new Set(room.completed_levels?.map(l => l.id) || []);
  const allInitialCompleted = initialLevels.length > 0 && initialLevels.every(l => completedLevelIds.has(l.id));

  const guiltyPool = accumulatedSuspects.filter(s => guiltyIds.includes(s.id));
  const innocentPool = accumulatedSuspects.filter(s => innocentIds.includes(s.id));
  const unassignedPool = accumulatedSuspects.filter(s => !guiltyIds.includes(s.id) && !innocentIds.includes(s.id));

  const verdictMutation = useMutation({
    mutationFn: async (submittedGuiltyIds: number[]) => {
      const result = await submitSuspectVerdict(room.id, submittedGuiltyIds);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: (data) => {
      if (data.status === 'failed') {
        setFeedback({ type: 'error', message: data.message });
        refreshRoomData();
      } else {
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes(`room_${room.invite_code}`) || key.includes(`room_${room.id}`)) {
            sessionStorage.removeItem(key);
          }
        });

        setGameOverData(data.message, data.stats);
        refreshRoomData();
      }
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleDragStart = (e: React.DragEvent, suspectId: number, source: PoolType) => {
    e.dataTransfer.setData('suspectId', suspectId.toString());
    e.dataTransfer.setData('sourcePool', source);
  };

  const handleDrop = (e: React.DragEvent, targetPool: PoolType) => {
    e.preventDefault();

    const suspectId = parseInt(e.dataTransfer.getData('suspectId'));
    if (isNaN(suspectId)) return;

    let nextGuilty = guiltyIds.filter(id => id !== suspectId);
    let nextInnocent = innocentIds.filter(id => id !== suspectId);

    if (targetPool === 'guilty') nextGuilty.push(suspectId);
    if (targetPool === 'innocent') nextInnocent.push(suspectId);

    setGuiltyIds(nextGuilty);
    setInnocentIds(nextInnocent);

    sessionStorage.setItem(`room_${room.invite_code}_guilty_suspects`, JSON.stringify(nextGuilty));
    sessionStorage.setItem(`room_${room.invite_code}_innocent_suspects`, JSON.stringify(nextInnocent));
  };

  const handleSubmitVerdict = () => {
    verdictMutation.mutate(guiltyIds);
  };

  const clearFeedback = () => {
    setFeedback(null);
    refreshRoomData();
  };

  const isAllAssigned = unassignedPool.length === 0;
  const isReadyToSubmit = allInitialCompleted && isAllAssigned;
  const isNoFoulPlay = isAllAssigned && guiltyPool.length === 0;

  return (
    <div className="suspects-tab-container">
      {feedback && (
        <div className="feedback-modal-overlay">
          <div className={`feedback-modal-content ${feedback.type}`}>
            <div className="persona-container">
              <svg className="persona-silhouette" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M100 50 C100 20, 156 20, 156 50 L160 80 L96 80 Z" />
                <ellipse cx="128" cy="85" rx="70" ry="12" />
                <path d="M105 100 L151 100 C151 125, 138 145, 128 145 C118 145, 105 125, 105 100 Z" />
                <path d="M128 135 C80 135, 40 190, 20 256 L236 256 C216 190, 176 135, 128 135 Z" />
              </svg>
            </div>
            <h3 className="feedback-title">{t('pages.gameRoom.suspects.tab.indictmentRejected')}</h3>
            <p className="feedback-message">{feedback.message}</p>
            <button className="btn-secondary mt-1" onClick={clearFeedback}>{t('pages.gameRoom.suspects.tab.reassessEvidence')}</button>
          </div>
        </div>
      )}

      <div className="verdict-zones">
        <div
          className="drop-zone guilty-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'guilty')}
        >
          <div className="zone-header">
            <h3>{t('pages.gameRoom.suspects.tab.primeSuspects')}</h3>
            <span className="zone-counter">{guiltyPool.length}</span>
          </div>
          <div className="zone-content">
            {guiltyPool.map(s => (
              <SuspectCard
                key={s.id}
                suspect={s}
                sourcePool="guilty"
                isDraggable={true}
                isNew={!viewedSuspects.has(s.id)}
                onDragStart={handleDragStart}
                onInteract={markSuspectAsViewed}
              />
            ))}
            {guiltyPool.length === 0 && <div className="zone-placeholder">{t('pages.gameRoom.suspects.tab.dragPrimeHere')}</div>}
          </div>
        </div>

        <div
          className="drop-zone innocent-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'innocent')}
        >
          <div className="zone-header">
            <h3>{t('pages.gameRoom.suspects.tab.cleared')}</h3>
            <span className="zone-counter">{innocentPool.length}</span>
          </div>
          <div className="zone-content">
            {innocentPool.map(s => (
              <SuspectCard
                key={s.id}
                suspect={s}
                sourcePool="innocent"
                isDraggable={true}
                isNew={!viewedSuspects.has(s.id)}
                onDragStart={handleDragStart}
                onInteract={markSuspectAsViewed}
              />
            ))}
            {innocentPool.length === 0 && <div className="zone-placeholder">{t('pages.gameRoom.suspects.tab.dragClearedHere')}</div>}
          </div>
        </div>
      </div>

      <div
        className="unassigned-pool"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, 'unassigned')}
      >
        <div className="zone-header">
          <h3>{t('pages.gameRoom.suspects.tab.unassigned')}</h3>
        </div>
        <div className="unassigned-grid">
          {unassignedPool.map(s => (
            <SuspectCard
              key={s.id}
              suspect={s}
              sourcePool="unassigned"
              isDraggable={true}
              isNew={!viewedSuspects.has(s.id)}
              onDragStart={handleDragStart}
              onInteract={markSuspectAsViewed}
            />
          ))}
          {unassignedPool.length === 0 && accumulatedSuspects.length > 0 && (
            <div className="zone-placeholder">{t('pages.gameRoom.suspects.tab.allCategorized')}</div>
          )}
          {accumulatedSuspects.length === 0 && (
            <div className="zone-placeholder">{t('pages.gameRoom.suspects.tab.noSuspects')}</div>
          )}
        </div>
      </div>

      <div className="submit-verdict-container" style={{ flexDirection: 'column', gap: '1rem' }}>
        <button
          className={`btn-primary final-verdict-btn ${isNoFoulPlay ? 'no-foul-play' : ''}`}
          disabled={!isReadyToSubmit || verdictMutation.isPending}
          onClick={handleSubmitVerdict}
        >
          {verdictMutation.isPending
            ? t('pages.gameRoom.suspects.tab.filingIndictment')
            : isNoFoulPlay
              ? t('pages.gameRoom.suspects.tab.ruleAccident')
              : t('pages.gameRoom.suspects.tab.submitIndictment')}
        </button>

        {isReadyToSubmit && isNoFoulPlay && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t('pages.gameRoom.suspects.tab.emptyPoolWarning')}
          </span>
        )}

        {!allInitialCompleted && (
          <span className="lock-warning-text">
            {t('pages.gameRoom.suspects.tab.lockWarning')}
          </span>
        )}
      </div>
    </div>
  );
}