import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './ConfirmContext';
import styles from './ConfirmDialog.module.css';

/**
 * Provider that supplies a promise-based `confirm()` and renders the modal for
 * it. Must wrap any component that calls `useConfirm`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { adminT } = useAdminTranslation();
  const t = adminT.component.confirmDialog;

  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [closing, setClosing] = useState(false);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((input) => {
    const opts: ConfirmOptions = typeof input === 'string' ? { message: input } : input;
    setClosing(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setClosing(true);
  }, []);

  const finishClose = useCallback(() => {
    setOptions(null);
    setClosing(false);
  }, []);

  // Unmount only after the exit animation finishes (interruptible, no lockout
  // because the promise has already resolved by the time we animate out).
  const handleAnimationEnd = useCallback(() => {
    if (closing) finishClose();
  }, [closing, finishClose]);

  // Fallback for prefers-reduced-motion, where the exit animation is disabled
  // and therefore never fires an animationend event.
  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(finishClose, 240);
    return () => window.clearTimeout(id);
  }, [closing, finishClose]);

  useEffect(() => {
    if (!options) return;

    // Destructive actions focus the safe option so an accidental Enter can't delete.
    (options.danger ? cancelBtnRef.current : confirmBtnRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settle(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className={`${styles.overlay} ${closing ? styles.closing : ''}`}
          role="presentation"
          onClick={() => settle(false)}
        >
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onAnimationEnd={handleAnimationEnd}
          >
            <h3 className={styles.title}>{options.title ?? t.defaultTitle}</h3>
            <p className={styles.message}>{options.message}</p>
            <div className={styles.actions}>
              <button
                type="button"
                ref={cancelBtnRef}
                className={styles.cancelBtn}
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? t.cancelBtn}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                className={`${styles.confirmBtn} ${options.danger ? styles.danger : ''}`}
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? t.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
