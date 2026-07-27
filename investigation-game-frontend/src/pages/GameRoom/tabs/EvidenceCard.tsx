import type { Evidence } from '../../../types';
import './EvidenceBoard.css';

interface EvidenceCardProps {
  evidence: Evidence;
  index: number;
  onInspect: (evidence: Evidence) => void; // <-- Add this
}

export default function EvidenceCard({ evidence, index, onInspect }: EvidenceCardProps) {
    const handleInspect = () => {
    onInspect(evidence);
  };

  const renderContent = () => {
    switch (evidence.evidence_type) {
      case 'document':
        return (
          <div className="evidence-variant document-variant">
            <div className="digital-pin amber"></div>
            <div className="folder-tab"></div>
            <h4 className="evidence-title">{evidence.title}</h4>
            <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
            <p className="evidence-desc">{evidence.description}</p>
          </div>
        );

      case 'testimony':
        return (
          <div className="evidence-variant testimony-variant">
            <div className="digital-pin cyan"></div>
            <div className="quote-mark">“</div>
            <h4 className="evidence-title">{evidence.title}</h4>
            <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
            <div className="testimony-lines"></div>
          </div>
        );

      case 'audio':
        return (
          <div className="evidence-variant audio-variant">
            <div className="digital-pin cyan"></div>
            <div className="audio-tape-ui">
              <div className="audio-spool"></div>
              <div className="audio-spool"></div>
            </div>
            <h4 className="evidence-title">{evidence.title}</h4>
            <span className="evidence-id">Voice Record</span>
          </div>
        );

      case 'image':
        return (
          <div className="evidence-variant image-variant">
            <div className="digital-tape"></div>
            <div 
              className="image-frame" 
              style={{ backgroundImage: `url(${evidence.img_url || '/placeholder-crime-scene.jpg'})` }}
            ></div>
            <div className="image-caption">
              <h4 className="evidence-title">{evidence.title}</h4>
            </div>
          </div>
        );

      case 'forensic':
        return (
          <div className="evidence-variant forensic-variant">
            <div className="digital-pin crimson"></div>
            <div className="forensic-header">
              <span className="forensic-icon">✧</span>
              <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
            </div>
            <h4 className="evidence-title">{evidence.title}</h4>
            <p className="evidence-desc">{evidence.description}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`evidence-card-wrapper item-${index % 5}`} onClick={handleInspect}>
      {renderContent()}
    </div>
  );
}