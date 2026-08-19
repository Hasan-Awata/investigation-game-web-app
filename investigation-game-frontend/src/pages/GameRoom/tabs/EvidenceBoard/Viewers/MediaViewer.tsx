import type { MediaEvidence } from '@/types/evidence';
import './MediaViewer.css'; 

interface MediaViewerProps {
  evidence: MediaEvidence;
}

export default function MediaViewer({ evidence }: MediaViewerProps) {
  const { evidence_type, description, img_url, audio_url, metadata } = evidence;

  const renderContent = () => {
    switch (evidence_type) {
      case 'image':
        return (
          <div className="media-image-container">
            <img 
              src={img_url || '/placeholder-crime-scene.jpg'} 
              alt={evidence.title} 
              className="media-full-image" 
            />
            {description && <p className="media-caption">{description}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="media-audio-container">
            <div className="audio-visualizer-mock"></div>
            <audio controls src={audio_url || ''} className="media-audio-player">
              Your browser does not support the audio element.
            </audio>
            {description && <p className="media-caption">{description}</p>}
          </div>
        );

      case 'testimony':
        return (
          <div className="media-testimony-container">
            <div className="testimony-header">
              <span className="testimony-label">OFFICIAL TRANSCRIPT</span>
            </div>
            <div className="testimony-body">
              {/* Fallback to description if transcript metadata isn't set yet */}
              {metadata?.transcript || description || 'Transcript unavailable.'}
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