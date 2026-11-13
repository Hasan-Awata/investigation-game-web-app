import PopupAction from '@/components/PopupAction';
import PopupDialog from '@/components/PopupDialog';
import { useTranslation } from 'react-i18next';

interface RoomExitDialogProps {
  isLeaving: boolean;
  onCancel: () => void;
  onLeave: () => void;
}

export default function RoomExitDialog({ isLeaving, onCancel, onLeave }: RoomExitDialogProps) {
  const { t } = useTranslation();

  return (
    <PopupDialog title={t('pages.gameRoom.layout.exitWarningTitle', 'Abandon Investigation?')} tone="error" safeFocus
      actions={<>
        <PopupAction onClick={onCancel}>{t('pages.gameRoom.layout.stay', 'Maintain Connection')}</PopupAction>
        <PopupAction danger onClick={onLeave} disabled={isLeaving}>
          {isLeaving ? t('pages.gameRoom.layout.leaving', 'Severing...') : t('pages.gameRoom.layout.leave', 'Sever Connection')}
        </PopupAction>
      </>}>
      <p>{t('pages.gameRoom.layout.exitWarningDesc', 'Leaving will disconnect you from this session. If you are the host, hosting will transfer to another player.')}</p>
    </PopupDialog>
  );
}
