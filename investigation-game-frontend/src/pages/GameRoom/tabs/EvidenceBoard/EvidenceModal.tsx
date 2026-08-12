import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm'; 
import type { Evidence } from '@/types';
import './EvidenceBoardTab.css';
import './EvidenceModal.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  if (!evidence) return null;

  return (
    <div className="evidence-modal-overlay" onClick={onClose}>
      <div className="evidence-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        
        <header className="modal-header">
          <div className="modal-meta">
            <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
            <span className="evidence-type-badge">{evidence.evidence_type}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </header>

        <h2 className="modal-title">{evidence.title}</h2>
        <p className="modal-desc">{evidence.description}</p>

        <div className="modal-body">
          {evidence.paragraph && (
            <div className={`evidence-text-content type-${evidence.evidence_type}`}>
              {/* remarkGfm enables tables, strikethrough, task lists, etc. */}
              <ReactMarkdown remarkPlugins={[remarkGfm]} >
                {evidence.paragraph}
              </ReactMarkdown>
            </div>
          )}

          {/* Media renderer for Images */}
          {evidence.evidence_type === 'image' && (
            <div className="evidence-media-container">
              <img 
                src={evidence.img_url || '/placeholder-crime-scene.jpg'} 
                alt={evidence.title} 
                className="evidence-full-image" 
              />
            </div>
          )}

          {/* Media renderer for Audio */}
          {evidence.evidence_type === 'audio' && (
            <div className="evidence-media-container audio-container">
              <div className="audio-visualizer-mock"></div>
              <audio controls src={evidence.audio_url} className="evidence-audio-player">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}