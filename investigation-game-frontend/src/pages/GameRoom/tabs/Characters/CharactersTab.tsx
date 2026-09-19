import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { useRoomData, useRoomUI } from '@/context/RoomContext';
import CharacterCard from './CharacterCard';
import styles from './CharactersTab.module.css';

interface CharactersTabProps {
  guiltyIds: number[];
  isSubmitting: boolean;
  feedback: any;
  submitVerdict: () => void;
  clearFeedback: () => void;
}

const CharactersTab = React.memo(({ guiltyIds, isSubmitting, feedback, submitVerdict, clearFeedback }: CharactersTabProps) => {
  const { t } = useTranslation();
  const { room, accumulatedCharacters } = useRoomData();
  const { viewedCharacters, markCharacterAsViewed } = useRoomUI();

  // Create Dropzones
  const { isOver: isOverGuilty, setNodeRef: setGuiltyRef } = useDroppable({ id: 'guilty-zone' });
  const { isOver: isOverUnassigned, setNodeRef: setUnassignedRef } = useDroppable({ id: 'unassigned-zone' });

  const initialLevels = room.game_case?.zones?.flatMap(z => z.levels || []).filter(l => l.is_initial) || [];
  const completedLevelIds = new Set(room.completed_levels?.map(l => l.id) || []);
  const allInitialCompleted = initialLevels.length > 0 && initialLevels.every(l => completedLevelIds.has(l.id));

  // 1. The Fix: Map strictly off the guiltyIds array to preserve player drop order
  const guiltyPool = guiltyIds
    .map(id => accumulatedCharacters.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  // 2. Unassigned pool can remain natively ordered
  const unassignedPool = accumulatedCharacters.filter(c => !guiltyIds.includes(c.id));

  const isReadyToSubmit = allInitialCompleted;
  const isNoFoulPlay = guiltyPool.length === 0;

  return (
    <div className={styles.tabContainer}>
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
        <div ref={setGuiltyRef} className={`${styles.dropZone} ${styles.guiltyZone} ${isOverGuilty ? styles.isDragOver : ''}`}>
          <div className={styles.zoneHeader}>
            <h3 className={styles.guiltyHeaderTitle}>{t('pages.gameRoom.suspects.tab.primeSuspects')}</h3>
            <span className={styles.zoneCounter}>{guiltyPool.length}</span>
          </div>
          <div className={styles.zoneContent}>
            {guiltyPool.map((c, index) => (
              <div key={c.id} className={styles.boardScatterItem} style={{ '--scatter-index': index } as React.CSSProperties}>
                <CharacterCard character={c} sourcePool="guilty" isDraggable={true} isNew={!viewedCharacters.has(c.id)} onInteract={markCharacterAsViewed} />
              </div>
            ))}
            {guiltyPool.length === 0 && <div className={styles.zonePlaceholder}>{t('pages.gameRoom.suspects.tab.dragPrimeHere')}</div>}
          </div>
        </div>
      </div>

      <div ref={setUnassignedRef} className={`${styles.unassignedPool} ${isOverUnassigned ? styles.isDragOver : ''}`}>
        <div className={styles.zoneHeader}>
          <h3>{t('pages.gameRoom.suspects.tab.unassigned')}</h3>
          <span className={styles.unassignedHint}>
            {t('pages.gameRoom.suspects.tab.uninvolvedHint', 'Leftover profiles are considered innocent or uninvolved.')}
          </span>
        </div>
        <div className={styles.unassignedGrid}>
          {unassignedPool.map(c => (
            <CharacterCard key={c.id} character={c} sourcePool="unassigned" isDraggable={true} isNew={!viewedCharacters.has(c.id)} onInteract={markCharacterAsViewed} />
          ))}
          {unassignedPool.length === 0 && accumulatedCharacters.length > 0 && <div className={styles.zonePlaceholder}>{t('pages.gameRoom.suspects.tab.allCategorized')}</div>}
          {accumulatedCharacters.length === 0 && <div className={styles.zonePlaceholder}>{t('pages.gameRoom.suspects.tab.noSuspects', 'No persons of interest identified.')}</div>}
        </div>
      </div>

      <div className={styles.submitContainer}>
        <button
          className={`${styles.submitBtn} ${isNoFoulPlay ? styles.submitBtnNeutral : styles.submitBtnCrimson}`}
          disabled={!isReadyToSubmit || isSubmitting}
          onClick={submitVerdict}
        >
          {isSubmitting
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
});

export default CharactersTab;