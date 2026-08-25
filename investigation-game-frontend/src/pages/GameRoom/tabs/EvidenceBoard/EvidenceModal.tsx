import type { Evidence, ForensicEvidence, DocumentEvidence, MediaEvidence } from '@/types/evidence';
import ForensicViewer from './Viewers/ForensicViewer';
import DocumentViewer from './Viewers/DocumentViewers/DocumentViewer';
import TestimonyViewer from './Viewers/TestimonyViewer';
import MediaViewer from './Viewers/MediaViewer';
import './EvidenceModal.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  if (!evidence) return null;

  const renderEvidenceContent = () => {
    switch (evidence.evidence_type) {
      case 'forensic':
        return <ForensicViewer evidence={evidence as ForensicEvidence} />;
      
      case 'document':
        return <DocumentViewer evidence={evidence as DocumentEvidence} />;
      
      case 'testimony':
        return <TestimonyViewer evidence={evidence} />; 
      
      case 'image':
      case 'audio':
        return <MediaViewer evidence={evidence as MediaEvidence} />;
        
      default:
        return (
          <div style={{ color: 'var(--accent-crimson)', fontFamily: 'var(--font-mono)' }}>
            Error: Unrecognized evidence classification.
          </div>
        );
    }
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

        {/* Dynamic Inner Viewer */}
        <div className="modal-body">
          {renderEvidenceContent()}
        </div>

      </div>
    </div>
  );
}