import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import PopupAction from '@/components/PopupAction';
import styles from './CharactersTab.module.css';

interface FinishCaseActionProps {
  ready: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function FinishCaseAction({ ready, isSubmitting, onSubmit }: FinishCaseActionProps) {
  const { t } = useTranslation();
  const lockedId = useId();
  const pendingLabel = t('pages.gameRoom.characterFolio.filingPending');

  return <footer className={styles.filing}>
    <PopupAction accent="amber" className={styles.submit} disabled={!ready || isSubmitting}
      aria-busy={isSubmitting} aria-label={isSubmitting ? pendingLabel : undefined}
      aria-describedby={!ready ? lockedId : undefined} onClick={onSubmit}>
      {isSubmitting ? <svg className={styles.loadingDocument} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M8 5h17l7 7v23H8zM25 5v8h7" />
        <path className={styles.documentLines} d="M13 17h13M13 22h13M13 27h9" />
        <path className={styles.scanLine} d="M5 17h30" strokeWidth="2" />
      </svg> : t('pages.gameRoom.characterFolio.submit')}
    </PopupAction>
    {!ready && <p id={lockedId} className={styles.lockedNotice}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7v1" />
      </svg>
      <span>{t('pages.gameRoom.characterFolio.locked')}</span>
    </p>}
    <span className={styles.srOnly} role="status">{isSubmitting ? pendingLabel : ''}</span>
  </footer>;
}
