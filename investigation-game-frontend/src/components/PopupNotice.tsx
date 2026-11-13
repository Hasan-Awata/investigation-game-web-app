import type { ReactNode } from 'react';
import styles from './PopupNotice.module.css';

interface PopupNoticeProps {
  icon: ReactNode;
  children: ReactNode;
  tone?: 'success' | 'error';
}

export default function PopupNotice({ icon, children, tone }: PopupNoticeProps) {
  return (
    <div className={styles.notice} data-tone={tone}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
