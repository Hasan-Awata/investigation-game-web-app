import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../GameRoomLayout.module.css';

export default function SessionCode({ inviteCode }: { inviteCode: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'pending' | 'copied' | 'failed'>('idle');
  const mounted = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(resetTimer.current);
    };
  }, []);

  const copyCode = async () => {
    clearTimeout(resetTimer.current);
    setStatus('pending');
    try {
      await navigator.clipboard.writeText(inviteCode);
      if (!mounted.current) return;
      setStatus('copied');
      resetTimer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      if (mounted.current) setStatus('failed');
    }
  };

  const label = t('gameRoom.copySessionCode');

  return (
    <div className={styles.sessionCode}>
      <div className={styles.sessionCodeHeader}>
        <h3 className={styles.sidebarContentHeading}>{t('gameRoom.sessionCode')}</h3>
        <button type="button" className={styles.toggleIconBtn} data-copied={status === 'copied'}
          aria-label={label} title={label} aria-disabled={!inviteCode || status === 'pending'}
          onClick={() => { if (inviteCode && status !== 'pending') void copyCode(); }}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {status === 'copied' ? <path d="m5 12 4 4L19 6" /> : (
              <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>
            )}
          </svg>
        </button>
      </div>
      <div className={styles.inviteCodeDisplay} dir="ltr">{inviteCode}</div>
      <span role="status" className={status === 'failed' ? styles.sessionCopyError : styles.sessionCopyStatus}>
        {status === 'copied' ? t('gameRoom.sessionCodeCopied') : status === 'failed' ? t('gameRoom.sessionCodeCopyFailed') : ''}
      </span>
    </div>
  );
}
