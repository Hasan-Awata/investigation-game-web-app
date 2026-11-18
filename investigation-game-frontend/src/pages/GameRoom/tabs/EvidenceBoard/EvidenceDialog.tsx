import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const EXIT_DURATION_MS = 160;

interface EvidenceDialogProps {
  children: (dismiss: () => void) => ReactNode;
  className: string;
  titleId: string;
  descriptionId?: string;
  animated?: boolean;
  onClose: () => void;
}

export default function EvidenceDialog({
  children, className, titleId, descriptionId, animated = false, onClose,
}: EvidenceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPressed = useRef(false);
  const [closing, setClosing] = useState(false);
  const finishClose = useEffectEvent(onClose);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => finishClose(), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialog.querySelector<HTMLButtonElement>('[data-evidence-close]')?.focus();

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const dismiss = () => {
    if (closing) return;
    if (!animated || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    setClosing(true);
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className={className}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-closing={closing || undefined}
      onCancel={event => {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }}
      onPointerDown={event => {
        backdropPressed.current = event.button === 0 && event.target === event.currentTarget;
      }}
      onPointerCancel={() => { backdropPressed.current = false; }}
      onClick={event => {
        const pressedOutside = backdropPressed.current;
        backdropPressed.current = false;
        if (pressedOutside && event.target === event.currentTarget) dismiss();
      }}
    >
      {children(dismiss)}
    </dialog>,
    document.body,
  );
}
