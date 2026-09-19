import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext';
import { submitSuspectVerdict } from '@/services/api';
import { useMutation } from '@tanstack/react-query';
import CharacterCard from './CharacterCard';
import styles from './CharactersTab.module.css';

type PoolType = 'unassigned' | 'guilty';

export default function CharactersTab() {
  const { t } = useTranslation();
  const { room, accumulatedCharacters, refreshRoomData } = useRoomData();
  const { viewedCharacters, markCharacterAsViewed, setGameOverData } = useRoomUI();

  const [guiltyIds, setGuiltyIds] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem(`room_${room.invite_code}_guilty_characters`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const initialLevels = room.game_case?.zones?.flatMap(z => z.levels || []).filter(l => l.is_initial) || [];
  const completedLevelIds = new Set(room.completed_levels?.map(l => l.id) || []);
  const allInitialCompleted = initialLevels.length > 0 && initialLevels.every(l => completedLevelIds.has(l.id));

  const guiltyPool = accumulatedCharacters.filter(c => guiltyIds.includes(c.id));
  const unassignedPool = accumulatedCharacters.filter(c => !guiltyIds.includes(c.id));

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

  const handleDragStart = (e: React.DragEvent, characterId: number, source: PoolType) => {
    e.dataTransfer.setData('characterId', characterId.toString());
    e.dataTransfer.setData('sourcePool', source);
  };

  const handleDrop = (e: React.DragEvent, targetPool: PoolType) => {
    e.preventDefault();

    const characterId = parseInt(e.dataTransfer.getData('characterId'));
    if (isNaN(characterId)) return;

    let nextGuilty = guiltyIds.filter(id => id !== characterId);

    if (targetPool === 'guilty') nextGuilty.push(characterId);

    setGuiltyIds(nextGuilty);
    sessionStorage.setItem(`room_${room.invite_code}_guilty_characters`, JSON.stringify(nextGuilty));
  };

  const handleSubmitVerdict = () => verdictMutation.mutate(guiltyIds);

  const clearFeedback = () => {
    setFeedback(null);
    refreshRoomData();
  };

  const isReadyToSubmit = allInitialCompleted;
  const isNoFoulPlay = guiltyPool.length === 0;

  return (
    <div className={styles.tabContainer}>
      {/* Kept global class for the feedback modal to match GameRoom layout conventions */}
      {feedback && (
        <div className="feedback-modal-overlay">
          <div className={`feedback-modal-content ${feedback.type}`}>
            <h3 className="feedback-title">{t('pages.gameRoom.suspects.tab.indictmentRejected')}</h3>
            <p className="feedback-message">{feedback.message}</p>
            <button className="btn-secondary mt-1" onClick={clearFeedback}>{t('pages.gameRoom.suspects.tab.reassessEvidence')}</button>
          </div>
        </div>
      )}

      <div className={styles.verdictZones}>
        <div 
          className={`${styles.dropZone} ${styles.guiltyZone}`} 
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => handleDrop(e, 'guilty')}
        >
          <div className={styles.zoneHeader}>
            <h3 className={styles.guiltyHeaderTitle}>{t('pages.gameRoom.suspects.tab.primeSuspects')}</h3>
            <span className={styles.zoneCounter}>{guiltyPool.length}</span>
          </div>
          <div className={styles.zoneContent}>
            {guiltyPool.map((c, index) => (
              <div key={c.id} className={styles.boardScatterItem} style={{ '--scatter-index': index } as React.CSSProperties}>
                <CharacterCard character={c} sourcePool="guilty" isDraggable={true} isNew={!viewedCharacters.has(c.id)} onDragStart={handleDragStart} onInteract={markCharacterAsViewed} />
              </div>
            ))}
            {guiltyPool.length === 0 && <div className={styles.zonePlaceholder}>{t('pages.gameRoom.suspects.tab.dragPrimeHere')}</div>}
          </div>
        </div>
      </div>

      <div 
        className={styles.unassignedPool} 
        onDragOver={(e) => e.preventDefault()} 
        onDrop={(e) => handleDrop(e, 'unassigned')}
      >
        <div className={styles.zoneHeader}>
          <h3>{t('pages.gameRoom.suspects.tab.unassigned')}</h3>
          <span className={styles.unassignedHint}>
            {t('pages.gameRoom.suspects.tab.uninvolvedHint', 'Leftover profiles are considered innocent or uninvolved.')}
          </span>
        </div>
        <div className={styles.unassignedGrid}>
          {unassignedPool.map(c => (
            <CharacterCard key={c.id} character={c} sourcePool="unassigned" isDraggable={true} isNew={!viewedCharacters.has(c.id)} onDragStart={handleDragStart} onInteract={markCharacterAsViewed} />
          ))}
          {unassignedPool.length === 0 && accumulatedCharacters.length > 0 && <div className={styles.zonePlaceholder}>{t('pages.gameRoom.suspects.tab.allCategorized')}</div>}
          {accumulatedCharacters.length === 0 && <div className={styles.zonePlaceholder}>{t('pages.gameRoom.suspects.tab.noSuspects', 'No persons of interest identified.')}</div>}
        </div>
      </div>

      <div className={styles.submitContainer}>
        <button
          className={`${styles.submitBtn} ${isNoFoulPlay ? styles.submitBtnNeutral : styles.submitBtnCrimson}`}
          disabled={!isReadyToSubmit || verdictMutation.isPending}
          onClick={handleSubmitVerdict}
        >
          {verdictMutation.isPending
            ? t('pages.gameRoom.suspects.tab.filingIndictment')
            : isNoFoulPlay
              ? t('pages.gameRoom.suspects.tab.ruleAccident')
              : t('pages.gameRoom.suspects.tab.submitIndictment')}
        </button>

        {isReadyToSubmit && isNoFoulPlay && <span className={styles.warningTextNeutral}>{t('pages.gameRoom.suspects.tab.emptyPoolWarning')}</span>}
        {!allInitialCompleted && <span className={styles.warningTextLocked}>{t('pages.gameRoom.suspects.tab.lockWarning')}</span>}
      </div>
    </div>
  );
}