import type { ButtonHTMLAttributes } from 'react';
import styles from './PopupAction.module.css';

interface PopupActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  danger?: boolean;
  accent?: 'amber';
}

export default function PopupAction({ primary = false, danger = false, accent, className, type = 'button', ...props }: PopupActionProps) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.action, className].filter(Boolean).join(' ')}
      data-primary={primary}
      data-danger={danger}
      data-accent={accent}
    />
  );
}
