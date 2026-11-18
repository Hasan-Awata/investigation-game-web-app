import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types/evidence';
import UniversalDocViewer from './DocViewer/UniversalDocViewer';
import TerminalViewer from './TerminalViewer/TerminalViewer';
import TestimonyViewer from './Viewers/TestimonyViewer';
import MediaViewer from './Viewers/MediaViewer';
import EvidenceDialog from './EvidenceDialog';
import AudioEvidenceModal from './AudioEvidenceModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EvidenceContext } from './EvidenceContext';
import styles from './EvidenceModal.module.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  if (evidence?.evidence_type === 'audio') {
    return <AudioEvidenceModal key={evidence.id} evidence={evidence} onClose={onClose} />;
  }
  return evidence ? <ActiveEvidenceModal key={evidence.id} evidence={evidence} onClose={onClose} /> : null;
}

function ActiveEvidenceModal({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const title = evidence.title || t('pages.gameRoom.evidence.modal.title');
  const closeLabel = t('pages.gameRoom.evidence.modal.close');
  const fullscreenLabel = t(isFullscreen ? 'pages.gameRoom.evidence.modal.minimize' : 'pages.gameRoom.evidence.modal.fullscreen');

  const renderEvidenceContent = () => {
    switch (evidence.evidence_type) {
      case 'document':
      case 'forensic':
        return <UniversalDocViewer evidence={evidence} />;
      case 'digital':
        return <TerminalViewer evidence={evidence} />;
      case 'testimony':
        return <TestimonyViewer evidence={evidence} />;
      case 'image':
        return <MediaViewer evidence={evidence} />;
    }

    return (
      <section role="status" className={styles.fallback}>
        <h2 dir="auto">{title}</h2>
        {evidence.description && <p dir="auto">{evidence.description}</p>}
      </section>
    );
  };

  return (
    <EvidenceDialog
      titleId={titleId}
      className={isFullscreen ? styles.evidenceModalContent + ' ' + styles.fullscreenModal : styles.evidenceModalContent}
      animated
      onClose={onClose}
    >
      {dismiss => <>
        <header className={styles.modalHeader}>
          <h2 id={titleId} className={styles.modalTitle}><bdi>{title}</bdi></h2>

          <div className={styles.modalActions}>
            <button
              className={styles.modalFullscreenBtn}
              onClick={() => setIsFullscreen(value => !value)}
              type="button" aria-pressed={isFullscreen}
              aria-label={fullscreenLabel}
              title={fullscreenLabel}
            >
              {isFullscreen ? (
                // Inward pointing arrows (Minimize)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              ) : (
                // Outward pointing arrows (Maximize)
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                </svg>
              )}
            </button>

            <button
              className={styles.modalCloseBtn}
              onClick={dismiss}
              data-evidence-close
              type="button" aria-label={closeLabel} title={closeLabel}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.modalBody}>
          <ErrorBoundary
            isLocal={true}
            fallbackMessage={`Evidence metadata payload for EX-${evidence.id.toString().padStart(3, '0')} is corrupted or malformed. Asset viewing aborted.`}
          >
            <EvidenceContext.Provider value={{ isFullscreen }}>
              {renderEvidenceContent()}
            </EvidenceContext.Provider>
          </ErrorBoundary>
        </div>
      </>}
    </EvidenceDialog>
  );
}
