import type { ButtonHTMLAttributes } from 'react';
import styles from './PopupAction.module.css';

interface PopupActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  danger?: boolean;
}

export default function PopupAction({ primary = false, danger = false, className, type = 'button', ...props }: PopupActionProps) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.action, className].filter(Boolean).join(' ')}
      data-primary={primary}
      data-danger={danger}
    />
  );
}
