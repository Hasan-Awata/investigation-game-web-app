import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { MediaEvidence } from '@/types/evidence';
import AudioEvidence from './EvidenceVariants/AudioEvidence';
import modalStyles from './EvidenceModal.module.css';
import styles from './AudioEvidenceModal.module.css';

interface AudioEvidenceModalProps {
  evidence: MediaEvidence;
  onClose: () => void;
}

export default function AudioEvidenceModal({ evidence, onClose }: AudioEvidenceModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const audioLabel = t('pages.gameRoom.evidence.modal.types.audio');
  const title = evidence.title || audioLabel;
  const exit = t('pages.gameRoom.evidence.modal.close');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const activeElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (activeElement instanceof HTMLElement && activeElement.isConnected) activeElement.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={evidence.description ? descriptionId : undefined}
      data-cassette-player
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 id={titleId} className={modalStyles.modalTitle}><bdi>{title}</bdi></h2>
          <button className={modalStyles.modalCloseBtn} onClick={onClose} type="button" aria-label={exit} title={exit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <AudioEvidence evidence={evidence} preview={false} />
        {evidence.description && <p className={styles.description} id={descriptionId}>{evidence.description}</p>}
      </div>
    </dialog>
  );
}
