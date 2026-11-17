import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { useRoomData, useRoomUI } from '@/context/RoomContext.shared';
import PopupAction from '@/components/PopupAction';
import RoomFeedbackDialog from '../../components/RoomDialogs/RoomFeedbackDialog';
import CharacterCard from './CharacterCard';
import styles from './CharactersTab.module.css';

interface CharactersTabProps {
  guiltyIds: number[];
  isSubmitting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  submitVerdict: () => void;
  clearFeedback: () => void;
}

const CharactersTab = React.memo(({ guiltyIds, isSubmitting, feedback, submitVerdict, clearFeedback }: CharactersTabProps) => {
  const { t } = useTranslation();
  const { room, accumulatedCharacters } = useRoomData();
  const { viewedCharacters, markCharacterAsViewed } = useRoomUI();
  const id = useId();
  const { isOver: isOverGuilty, setNodeRef: setGuiltyRef } = useDroppable({ id: 'guilty-zone' });
  const { isOver: isOverUnassigned, setNodeRef: setUnassignedRef } = useDroppable({ id: 'unassigned-zone' });
  // Location inspection does not produce completed-level records.
  const initialLevels = room.game_case?.zones?.flatMap(zone => zone.levels || [])
    .filter(level => level.is_initial && level.presentation_type === 'interrogation') || [];
  const completedIds = new Set(room.completed_levels?.map(level => level.id) || []);
  const completed = initialLevels.filter(level => completedIds.has(level.id)).length;
  const ready = completed === initialLevels.length;
  const guiltyPool = guiltyIds.map(characterId => accumulatedCharacters.find(character => character.id === characterId))
    .filter((character): character is NonNullable<typeof character> => character !== undefined);
  const unassignedPool = accumulatedCharacters.filter(character => !guiltyIds.includes(character.id));
  const copy = (key: string, options?: Record<string, unknown>) => t(`pages.gameRoom.characterFolio.${key}`, options);

  return <div className={styles.tabContainer}>
    {feedback && <RoomFeedbackDialog type={feedback.type} title={t('pages.gameRoom.suspects.tab.indictmentRejected')}
      message={feedback.message} acknowledgeLabel={t('pages.gameRoom.suspects.tab.reassessEvidence')} onAcknowledge={clearFeedback} />}
    <div className={styles.folio}>
      <section ref={setUnassignedRef} aria-labelledby={`${id}-unassigned`} className={`${styles.pool} ${isOverUnassigned ? styles.isDragOver : ''}`}>
        <header className={styles.poolHeader}><h3 id={`${id}-unassigned`}>{copy('unassigned')}</h3></header>
        <div className={styles.cards}>
          {unassignedPool.map(character => <CharacterCard key={character.id} character={character} sourcePool="unassigned" isDraggable isNew={!viewedCharacters.has(character.id)} onInteract={markCharacterAsViewed} />)}
          {!unassignedPool.length && <p className={styles.placeholder}>{copy(accumulatedCharacters.length ? 'allSelected' : 'empty')}</p>}
        </div>
      </section>
      <section ref={setGuiltyRef} aria-labelledby={`${id}-guilty`} className={`${styles.pool} ${styles.suspects} ${isOverGuilty ? styles.isDragOver : ''}`}>
        <header className={styles.poolHeader}><h3 id={`${id}-guilty`}>{copy('guilty')}</h3></header>
        <div className={styles.cards}>
          {guiltyPool.map(character => <CharacterCard key={character.id} character={character} sourcePool="guilty" isDraggable isNew={!viewedCharacters.has(character.id)} onInteract={markCharacterAsViewed} />)}
          {!guiltyPool.length && <p className={styles.placeholder}>{copy('dropHint')}</p>}
        </div>
      </section>
    </div>
    <footer className={styles.filing}>
      <PopupAction accent="amber" className={styles.submit} disabled={!ready || isSubmitting}
        aria-busy={isSubmitting} aria-label={isSubmitting ? copy('filingPending') : undefined}
        aria-describedby={!ready ? `${id}-locked` : undefined} onClick={submitVerdict}>
        {isSubmitting ? <svg className={styles.loadingDocument} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M8 5h17l7 7v23H8zM25 5v8h7" />
          <path className={styles.documentLines} d="M13 17h13M13 22h13M13 27h9" />
          <path className={styles.scanLine} d="M5 17h30" strokeWidth="2" />
        </svg> : copy('submit')}
      </PopupAction>
      {!ready && <p id={`${id}-locked`} className={styles.lockedNotice}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7v1" />
        </svg>
        <span>{copy('locked')}</span>
      </p>}
      <span className={styles.srOnly} role="status">{isSubmitting ? copy('filingPending') : ''}</span>
    </footer>
  </div>;
});

export default CharactersTab;
