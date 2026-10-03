import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; 
import type { Evidence } from '@/types/evidence';
import ViewersContainer from './ViewersContainer';
import mediaViewer from './MediaViewer.module.css';

type MediaEvidence = Extract<Evidence, { evidence_type: 'image' | 'audio' }>;

interface MediaViewerProps {
  evidence: MediaEvidence;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  
  const mediaUrl = evidence.img_url || (evidence.metadata as Record<string, any>)?.url;

  useEffect(() => {
    if (evidence.evidence_type !== 'image' || !mediaUrl) return;

    let isMounted = true;
    setIsImageLoaded(false);
    setDimensions(null);

    const img = new Image();
    img.src = mediaUrl;

    img.onload = () => {
      if (isMounted) {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = () => {
      if (isMounted) {
        setDimensions({ width: 16, height: 9 });
      }
    };

    return () => {
      isMounted = false;
    };
  }, [mediaUrl, evidence.evidence_type]);

  if (!mediaUrl) {
    return (
      <ViewersContainer evidence={evidence}>
        <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          {t('pages.gameRoom.evidence.viewers.media.noMediaFound')}
        </div>
      </ViewersContainer>
    );
  }

  const containerStyle = dimensions 
    ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
    : { minHeight: '300px' };

  return (
    <ViewersContainer evidence={evidence}>
      <div className={mediaViewer['media-viewer-wrapper']}>
        {evidence.evidence_type === 'image' ? (
          <div className={mediaViewer['media-image-container']} style={containerStyle}>
            {!isImageLoaded && <div className={mediaViewer['media-skeleton-loader']} />}

            <img 
              src={mediaUrl} 
              alt={evidence.title || t('pages.gameRoom.evidence.viewers.media.imageAltFallback')} 
              className={mediaViewer['media-full-image']}
              onLoad={() => setIsImageLoaded(true)}
              draggable={false} 
              style={{
                opacity: isImageLoaded ? 1 : 0,
              }}
            />
          </div>
        ) : (
          <div className={mediaViewer['media-audio-container']}>
            <div className={mediaViewer['audio-visualizer-mock']}></div>
            <audio controls className={mediaViewer['media-audio-player']}>
              <source src={mediaUrl} type="audio/mpeg" />
              {t('pages.gameRoom.evidence.viewers.media.audioNotSupported')}
            </audio>
          </div>
        )}

        <div className={mediaViewer['media-meta-plaque']}>
          <h3 className={mediaViewer['media-plaque-title']}>{evidence.title}</h3>
          {evidence.description && (
            <p className={mediaViewer['media-plaque-desc']}>{evidence.description}</p>
          )}
        </div>
      </div>
    </ViewersContainer>
  );
};

export default MediaViewer;