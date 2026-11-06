import { useTranslation } from 'react-i18next';
import styles from '../../GameRoom.module.css';

type RoomEntryStateProps =
  | { status: 'denied'; message: string }
  | { status: 'loading' }
  | { status: 'unavailable'; message: string | null; canRetry: boolean; isRecovering: boolean; onRetry: () => void };

export default function RoomEntryState(props: RoomEntryStateProps) {
  const { t } = useTranslation();

  if (props.status === 'denied') return <div className={styles.recoveryPanel} role="alert">{props.message} <a href="/">{t('pages.gameRoom.returnToMenu')}</a></div>;
  if (props.status === 'loading') return <div className="terminal-text">{t('pages.gameRoom.synchronizing')}</div>;

  const { message, canRetry, isRecovering, onRetry } = props;
  return (
    <div className={styles.recoveryPanel} role="alert" aria-busy={isRecovering}>
      <p>{message || t('pages.gameRoom.sessionNotFound')}</p>
      {canRetry && <button className="btn-primary" disabled={isRecovering} onClick={onRetry}>
        {t('pages.gameRoom.retry')}
      </button>}
    </div>
  );
}
