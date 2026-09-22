import type { FC, ReactNode } from 'react';
import styles from './CalloutBox.module.css';

export interface CalloutBoxProps {
  title?: string;
  children: ReactNode;
  variant?: 'standard' | 'warning' | 'critical';
}

const VARIANT_CLASS: Record<'standard' | 'warning' | 'critical', string> = {
  standard: styles['variant-standard'],
  warning: styles['variant-warning'],
  critical: styles['variant-critical'],
};

const CalloutBox: FC<CalloutBoxProps> = ({ title, children, variant = 'standard' }) => {
  return (
    <section className={`${styles.wrapper} ${VARIANT_CLASS[variant]}`}>
      {title && <div className={styles.title}>{title}</div>}
      {children}
    </section>
  );
};

export default CalloutBox;