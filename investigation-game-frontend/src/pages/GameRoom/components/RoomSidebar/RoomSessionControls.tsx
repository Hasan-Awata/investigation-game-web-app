import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../GameRoomLayout.module.css';

interface RoomSessionControlsProps {
  inviteCode: string;
  sidebarId: string;
  isSidebarCollapsed: boolean;
  onExit: () => void;
}

export default function RoomSessionControls({ inviteCode, sidebarId, isSidebarCollapsed, onExit }: RoomSessionControlsProps) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

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
    <div id={`${sidebarId}-session`} className={styles.sidebarSection} hidden={isSidebarCollapsed}>
      <div className={styles.sidebarHeadingWrapper}>
        <h3 className={styles.sidebarHeading}>{t('gameRoom.sessionCode')}</h3>
        <div className={styles.sessionActions}>
          <button className={`${styles.sessionActionBtn} ${styles.copyBtn} ${isCopied ? styles.copied : ''}`} onClick={handleCopyCode}>
            {isCopied ? '✓' : '⧉'}
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
    </div>
  );
}
