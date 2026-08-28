import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import './ImageEvidence.css';

export default function ImageEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  return (
    <div className="image-variant polaroid-style">
      {/* 3D red push-pin anchoring the photo */}
      <div className="red-push-pin"></div>

      {/* The photo area with realistic lighting */}
      <div className="photo-frame" style={{ position: 'relative' }}>
        {evidence.img_url ? (
          <>
            {/* Skeleton Loader: Active until the image fully downloads and paints */}
            {!isLoaded && (
              <div 
                className="image-skeleton-loader"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'var(--bg-skeleton, #e0e0e0)',
                  animation: 'pulse 1.5s infinite ease-in-out',
                  zIndex: 1 // Sits below the glare but above the background
                }}
              />
            )}
            
            <img 
              src={evidence.img_url} 
              alt={evidence.title} 
              className="actual-photo" 
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
              style={{
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.4s ease-in-out',
                position: 'relative',
                zIndex: 2
              }}
            />
          </>
        ) : (
          <div className="photo-placeholder">
            <span>{t('pages.gameRoom.evidence.variants.image.noImage')}</span>
          </div>
        )}

        {/* Glossy reflection overlay to make it look like photo paper */}
        <div className="photo-glare" style={{ zIndex: 3 }}></div>
      </div>

      {/* Sharpie marker handwritten caption */}
      <div className="photo-caption">
        <h4 className="evidence-title">{evidence.title}</h4>
        {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
      </div>
    </div>
  );
}