import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext.shared';
import { groupCharacters, isVerdictReady, type CharacterPoolOrder } from '@/utils/characterVerdict';
import RoomFeedbackDialog from '../../components/RoomDialogs/RoomFeedbackDialog';
import CharacterPool from './CharacterPool';
import FinishCaseAction from './FinishCaseAction';
import styles from './CharactersTab.module.css';

interface CharactersTabProps {
  characterOrder: CharacterPoolOrder;
  isSubmitting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  submitVerdict: () => void;
  clearFeedback: () => void;
}

const CharactersTab = memo(function CharactersTab({ characterOrder, isSubmitting, feedback, submitVerdict, clearFeedback }: CharactersTabProps) {
  const { t } = useTranslation();
  const { room, accumulatedCharacters } = useRoomData();
  const { viewedCharacters, markCharacterAsViewed } = useRoomUI();
  const pools = useMemo(() => groupCharacters(accumulatedCharacters, characterOrder), [accumulatedCharacters, characterOrder]);
  const ready = isVerdictReady(room);

  return <div className={styles.tabContainer}>
    {feedback && <RoomFeedbackDialog type={feedback.type} title={t('pages.gameRoom.suspects.tab.indictmentRejected')}
      message={feedback.message} acknowledgeLabel={t('pages.gameRoom.suspects.tab.reassessEvidence')} onAcknowledge={clearFeedback} />}
    <div className={styles.folio}>
      <CharacterPool pool="unassigned" title={t('pages.gameRoom.characterFolio.unassigned')}
        emptyMessage={t(`pages.gameRoom.characterFolio.${accumulatedCharacters.length ? 'allSelected' : 'empty'}`)}
        characters={pools.unassigned} viewedCharacters={viewedCharacters} onReadIntel={markCharacterAsViewed} />
      <CharacterPool pool="guilty" title={t('pages.gameRoom.characterFolio.guilty')}
        emptyMessage={t('pages.gameRoom.characterFolio.dropHint')}
        characters={pools.guilty} viewedCharacters={viewedCharacters} onReadIntel={markCharacterAsViewed} />
    </div>
    <FinishCaseAction ready={ready} isSubmitting={isSubmitting} onSubmit={submitVerdict} />
  </div>;
});

export default CharactersTab;
