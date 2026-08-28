import type { Evidence } from '@/types/evidence';
import ForensicViewer from './Viewers/ForensicViewer';
import DocumentViewer from './Viewers/DocumentViewer';
import TestimonyViewer from './Viewers/TestimonyViewer';
import MediaViewer from './Viewers/MediaViewer';
import ErrorBoundary from '@/components/ErrorBoundary';
import './EvidenceModal.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  if (!evidence) return null;

  const renderEvidenceContent = () => {
    // Component Map: O(1) lookup and adheres to the Open/Closed Principle
    const ViewerComponents: Record<string, React.ElementType> = {
      forensic: ForensicViewer,
      document: DocumentViewer,
      testimony: TestimonyViewer,
      image: MediaViewer,
      audio: MediaViewer,
    };

    const Viewer = ViewerComponents[evidence.evidence_type];

    if (!Viewer) {
      // Triggers our new localized ErrorBoundary if the payload type is garbage
      throw new Error(`Unrecognized evidence classification type: ${evidence.evidence_type}`);
    }

    return <Viewer evidence={evidence} />;
  };

  return (
    <div className="evidence-modal-overlay" onClick={onClose}>
      <div className="evidence-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>

        <header className="modal-header">
          <div className="modal-meta">
            <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
            <span className="evidence-type-badge">{evidence.evidence_type}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close File">×</button>
        </header>

        {/* Dynamic Inner Viewer - Wrapped in a Localized Error Boundary */}
        <div className="modal-body">
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