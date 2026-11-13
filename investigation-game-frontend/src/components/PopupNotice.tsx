import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { NotificationIconTone } from './notificationIcons';
import styles from './PopupNotice.module.css';

interface PopupNoticeProps {
  icon: ReactNode;
  children: ReactNode;
  iconTone?: NotificationIconTone;
  onDismiss?: () => void;
  tone?: 'success' | 'error';
}

export default function PopupNotice({ icon, children, tone, onDismiss, iconTone = 'intel' }: PopupNoticeProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.notice} data-tone={tone}>
      <div className={styles.icon} data-icon-tone={iconTone}>{icon}</div>
      <div className={styles.content}>{children}</div>
      {onDismiss && <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label={t('components.notifications.dismiss', 'Dismiss notification')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
    </div>
  );
}
