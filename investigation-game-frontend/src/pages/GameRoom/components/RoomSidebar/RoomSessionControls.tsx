import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RoomSettingsDialog from '../RoomDialogs/RoomSettingsDialog';
import styles from '../../GameRoomLayout.module.css';

interface RoomSessionControlsProps {
  inviteCode: string;
  onExit: () => void;
}

export default function RoomSessionControls({ inviteCode, onExit }: RoomSessionControlsProps) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={styles.sidebarSection}>
      <div className={styles.sidebarHeadingWrapper}>
        <h3 className={styles.sidebarHeading}>{t('gameRoom.sessionCode')}</h3>
        <div className={styles.sessionActions}>
          <button
            type="button"
            className={`${styles.sessionActionBtn} ${isCopied ? styles.copied : ''}`}
            onClick={handleCopyCode}
            title={t('gameRoom.copySessionCode')}
            aria-label={t('gameRoom.copySessionCode')}
          >
            {isCopied ? '✓' : '⧉'}
          </button>
          <button
            type="button"
            className={styles.sessionActionBtn}
            onClick={event => {
              event.currentTarget.focus();
              setIsSettingsOpen(true);
            }}
            title={t('gameRoom.settings.title')}
            aria-label={t('gameRoom.settings.title')}
            aria-haspopup="dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9.5 3-.6 2.4-2 .9L4.6 5.6 2 10l1.8 1.7v.6L2 14l2.6 4.4 2.3-.7 2 .9.6 2.4h5l.6-2.4 2-.9 2.3.7L22 14l-1.8-1.7v-.6L22 10l-2.6-4.4-2.3.7-2-.9-.6-2.4Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.sessionActionBtn} ${styles.leaveBtn}`}
            onClick={onExit}
            title={t('pages.gameRoom.layout.tabs.returnToMenu', 'Exit')}
            aria-label={t('pages.gameRoom.layout.tabs.returnToMenu', 'Exit')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.inviteCodeDisplay}>{inviteCode}</div>
      {isSettingsOpen && <RoomSettingsDialog onDismiss={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
