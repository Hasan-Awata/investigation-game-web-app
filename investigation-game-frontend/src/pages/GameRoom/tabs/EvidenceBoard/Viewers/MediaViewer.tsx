import React, { useState } from 'react';
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
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  
  // Safely extract the media URL depending on the data shape
  const mediaUrl = evidence.img_url || (evidence.metadata as Record<string, any>)?.url;

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
        <div className="media-image-container" style={{ position: 'relative', width: '100%', minHeight: '300px' }}>
          
          {/* Skeleton Loader: Renders underneath and displays while loading */}
          {!isImageLoaded && (
            <div 
              className="media-skeleton-loader"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--bg-skeleton, #e0e0e0)',
                animation: 'pulse 1.5s infinite ease-in-out',
                borderRadius: '8px'
              }}
            />
          )}

          <img 
            src={mediaUrl} 
            alt={evidence.title || t('pages.gameRoom.evidence.viewers.media.imageAltFallback')} 
            className="media-full-image"
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
            style={{
              opacity: isImageLoaded ? 1 : 0,
              transition: 'opacity 0.4s ease-in-out',
              display: 'block',
              width: '100%',
              height: 'auto',
              position: 'relative',
              zIndex: 1
            }}
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