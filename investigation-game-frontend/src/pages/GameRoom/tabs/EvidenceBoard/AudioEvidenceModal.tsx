import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { MediaEvidence } from '@/types/evidence';
import EvidenceDialog from './EvidenceDialog';
import AudioEvidence from './EvidenceVariants/AudioEvidence';
import modalStyles from './EvidenceModal.module.css';
import styles from './AudioEvidenceModal.module.css';

interface AudioEvidenceModalProps {
  evidence: MediaEvidence;
  onClose: () => void;
}

export default function AudioEvidenceModal({ evidence, onClose }: AudioEvidenceModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const audioLabel = t('pages.gameRoom.evidence.modal.types.audio');
  const title = evidence.title || audioLabel;
  const closeLabel = t('pages.gameRoom.evidence.modal.close');

  return (
    <EvidenceDialog
      className={styles.dialog}
      titleId={titleId}
      descriptionId={evidence.description ? descriptionId : undefined}
      onClose={onClose}
    >
      {dismiss => (
        <div className={styles.content} data-cassette-player>
          <div className={styles.header}>
            <h2 id={titleId} className={modalStyles.modalTitle}><bdi>{title}</bdi></h2>
            <button className={modalStyles.modalCloseBtn} onClick={dismiss} data-evidence-close type="button" aria-label={closeLabel} title={closeLabel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <AudioEvidence evidence={evidence} preview={false} />
          {evidence.description && <p className={styles.description} dir="auto" id={descriptionId}>{evidence.description}</p>}
        </div>
      )}
    </EvidenceDialog>
  );
}
