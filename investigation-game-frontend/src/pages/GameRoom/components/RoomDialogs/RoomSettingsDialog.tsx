import { useTranslation } from 'react-i18next';
import LanguageToggle from '@/components/LanguageToggle';
import PopupAction from '@/components/PopupAction';
import PopupDialog from '@/components/PopupDialog';
import styles from './RoomSettingsDialog.module.css';

interface RoomSettingsDialogProps {
  onDismiss: () => void;
}

export default function RoomSettingsDialog({ onDismiss }: RoomSettingsDialogProps) {
  const { t } = useTranslation();

  return (
    <PopupDialog
      title={t('gameRoom.settings.title')}
      onDismiss={onDismiss}
      actions={<PopupAction onClick={onDismiss}>{t('gameRoom.settings.close')}</PopupAction>}
    >
      <div className={styles.languageRow}>
        <span>{t('gameRoom.settings.language')}</span>
        <LanguageToggle />
      </div>
    </PopupDialog>
  );
}
