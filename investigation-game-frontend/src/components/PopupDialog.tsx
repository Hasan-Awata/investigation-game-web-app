import { useLayoutEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './PopupDialog.module.css';

interface PopupDialogProps {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  tone?: 'success' | 'error' | 'neutral';
  onDismiss?: () => void;
  safeFocus?: boolean;
}

export default function PopupDialog({ title, children, actions, tone = 'neutral', onDismiss, safeFocus = false }: PopupDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedBackdrop = useRef(false);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const previous = document.activeElement;
    dialog.showModal();
    const actions = dialog.querySelectorAll<HTMLButtonElement>('footer button:not(:disabled)');
    const initialAction = safeFocus ? actions[0] : actions[actions.length - 1];
    initialAction?.focus();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [safeFocus]);
  return createPortal(
    <dialog
      ref={ref}
      className={styles.dialog}
      data-tone={tone}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        onDismiss?.();
      }}
      onPointerDown={event => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={event => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onDismiss?.();
        pressedBackdrop.current = false;
      }}
    >
      <header><h2 id={titleId}>{title}</h2></header>
      <div className={styles.body}>{children}</div>
      <footer>{actions}</footer>
    </dialog>,
    document.body,
  );
}
