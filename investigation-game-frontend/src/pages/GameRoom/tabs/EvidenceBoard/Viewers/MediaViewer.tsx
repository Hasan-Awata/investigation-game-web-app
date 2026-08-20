import type { MediaEvidence } from '@/types/evidence';
import './MediaViewer.css'; 

interface MediaViewerProps {
  evidence: MediaEvidence;
}

export default function MediaViewer({ evidence }: MediaViewerProps) {
  const { evidence_type, description, img_url, audio_url, metadata, title } = evidence;

  const renderContent = () => {
    switch (evidence_type) {
      case 'image':
        return (
          <div className="media-image-container">
            <img 
              src={img_url || '/placeholder-crime-scene.jpg'} 
              alt={title} 
              className="media-full-image" 
            />
            <div className="media-meta-plaque">
              <h3 className="media-plaque-title">{title}</h3>
              {description && <p className="media-plaque-desc">{description}</p>}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="media-audio-container">
            <div className="audio-visualizer-mock"></div>
            <audio controls src={audio_url || ''} className="media-audio-player">
              Your browser does not support the audio element.
            </audio>
            <div className="media-meta-plaque">
              <h3 className="media-plaque-title">{title}</h3>
              {description && <p className="media-plaque-desc">{description}</p>}
            </div>
          </div>
        );

      case 'testimony':
        return (
          <div className="media-testimony-container">
            <div className="testimony-header">
              <span className="testimony-label">OFFICIAL TRANSCRIPT</span>
              <h3 className="media-plaque-title" style={{ marginTop: '0.5rem', marginBottom: 0 }}>{title}</h3>
              {description && <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>{description}</p>}
            </div>
            <div className="testimony-body">
              {metadata?.transcript || 'Transcript unavailable.'}
            </div>
          </div>
        );

      default:
        return <div className="media-caption">Media format unsupported.</div>;
    }
  };

  return (
    <div className="media-viewer-wrapper">
      {renderContent()}
    </div>
  );
}