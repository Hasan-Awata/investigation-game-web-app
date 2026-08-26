import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types/evidence';
import './MediaViewer.css';

// Extract strict Media type (only Image and Audio)
type MediaEvidence = Extract<Evidence, { evidence_type: 'image' | 'audio' }>;

interface MediaViewerProps {
  evidence: MediaEvidence;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  
  // We assume the asset path is stored in img_url for both images and audio, 
  // or inside metadata.url if your backend splits them up.
  const mediaUrl = evidence.img_url || (evidence.metadata as any)?.url;

  if (!mediaUrl) {
    return (
      <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        {t('pages.gameRoom.evidence.viewers.media.noMediaFound')}
      </div>
    );
  }

  return (
    <div className="media-viewer-wrapper">
      
      {/* CONDITIONAL RENDER: IMAGE OR AUDIO */}
      {evidence.evidence_type === 'image' ? (
        <div className="media-image-container">
          <img 
            src={mediaUrl} 
            alt={evidence.title || t('pages.gameRoom.evidence.viewers.media.imageAltFallback')} 
            className="media-full-image" 
          />
        </div>
      ) : (
        <div className="media-audio-container">
          <div className="audio-visualizer-mock"></div>
          <audio controls className="media-audio-player">
            <source src={mediaUrl} type="audio/mpeg" />
            {t('pages.gameRoom.evidence.viewers.media.audioNotSupported')}
          </audio>
        </div>
      )}

      {/* SHARED PLAQUE FOR TITLE & DESCRIPTION */}
      <div className="media-meta-plaque">
        <h3 className="media-plaque-title">{evidence.title}</h3>
        {evidence.description && (
          <p className="media-plaque-desc">{evidence.description}</p>
        )}
      </div>

    </div>
  );
};

export default MediaViewer;