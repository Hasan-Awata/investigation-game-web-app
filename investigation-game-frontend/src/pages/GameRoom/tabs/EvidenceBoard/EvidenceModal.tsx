import type { Evidence } from '@/types/evidence';
import ForensicViewer from './Viewers/ForensicViewer';
import DocumentViewer from './Viewers/DocumentViewer';
import TestimonyViewer from './Viewers/TestimonyViewer';
import MediaViewer from './Viewers/MediaViewer';
import ErrorBoundary from '@/components/ErrorBoundary';
import styles from './EvidenceModal.module.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  if (!evidence) return null;

  const renderEvidenceContent = () => {
    const ViewerComponents: Record<string, React.ElementType> = {
      forensic: ForensicViewer,
      document: DocumentViewer,
      testimony: TestimonyViewer,
      image: MediaViewer,
      audio: MediaViewer,
    };

    const Viewer = ViewerComponents[evidence.evidence_type];

    if (!Viewer) {
      throw new Error(`Unrecognized evidence classification type: ${evidence.evidence_type}`);
    }

    return <Viewer evidence={evidence} />;
  };

  return (
    <div className={styles.evidenceModalOverlay} onClick={onClose}>
      <div className={`${styles.evidenceModalContent} glass-panel`} onClick={(e) => e.stopPropagation()}>

        <header className={styles.modalHeader}>
          <div className={styles.modalMeta}>
            <span className={styles.evidenceId}>EX-{evidence.id.toString().padStart(3, '0')}</span>
            <span className={styles.evidenceTypeBadge}>{evidence.evidence_type}</span>
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose} title="Close File">×</button>
        </header>

        <div className={styles.modalBody}>
          <ErrorBoundary 
            isLocal={true} 
            fallbackMessage={`Evidence metadata payload for EX-${evidence.id.toString().padStart(3, '0')} is corrupted or malformed. Asset viewing aborted.`}
          >
            {renderEvidenceContent()}
          </ErrorBoundary>
        </div>

      </div>
    </div>
  );
}