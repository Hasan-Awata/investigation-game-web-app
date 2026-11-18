import { useTranslation } from 'react-i18next';
import PopupAction from '@/components/PopupAction';
import PopupDialog from '@/components/PopupDialog';
import { useRoomData } from '@/context/RoomContext.shared';
import { useGameMutation } from '@/hooks/useGameMutation';
import { removeRoomParticipant } from '@/services/api';
import styles from './RoomRemovePlayerDialog.module.css';

interface RoomRemovePlayerDialogProps {
  member: { id: number; name: string };
  onDismiss: () => void;
}

export default function RoomRemovePlayerDialog({ member, onDismiss }: RoomRemovePlayerDialogProps) {
  const { t } = useTranslation();
  const { room, refreshRoomData } = useRoomData();
  const removal = useGameMutation({
    mutationFn: () => removeRoomParticipant(room.id, member.id),
    dispatchErrorFeedback: false,
    onSuccess: () => {
      onDismiss();
      void refreshRoomData().catch(() => console.warn('Could not refresh the room after removing a player.'));
    },
  });

  return (
    <PopupDialog title={t('gameRoom.removePlayer.title')} tone="error" safeFocus
      onDismiss={removal.isPending ? undefined : onDismiss}
      actions={<>
        <PopupAction onClick={onDismiss} disabled={removal.isPending}>{t('gameRoom.removePlayer.cancel')}</PopupAction>
        <PopupAction danger onClick={() => removal.mutate()} disabled={removal.isPending} aria-busy={removal.isPending}>
          {removal.isPending ? (
            <span className={styles.pending} role="status">
              <span className={styles.progress} aria-hidden="true" />
              {t('gameRoom.removePlayer.pending')}
            </span>
          ) : t('gameRoom.removePlayer.confirm')}
        </PopupAction>
      </>}>
      <p>{t('gameRoom.removePlayer.description', { name: member.name })}</p>
      {removal.isError && <p role="alert">{t('gameRoom.removePlayer.failed')}</p>}
    </PopupDialog>
  );
}
