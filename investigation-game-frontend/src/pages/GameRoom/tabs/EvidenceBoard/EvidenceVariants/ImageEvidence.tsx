import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import imageEvidence from './ImageEvidence.module.css';

export default function ImageEvidence({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation();
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [shouldLoad, setShouldLoad] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Intersection Observer: Detects when the card approaches the viewport
  useEffect(() => {
    if (!containerRef.current || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true); // Triggers loading sequence
            observer.disconnect(); // Stop observing once triggered
          }
        });
      },
      { 
        root: null, // Uses the browser viewport
        rootMargin: '200px' // Starts preloading 200px before it enters the screen
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad]);

  // 2. Preload image metadata only AFTER the component is near the viewport
  useEffect(() => {
    if (!shouldLoad || !evidence.img_url) return;

    let isMounted = true;
    const img = new Image();
    img.src = evidence.img_url;

    img.onload = () => {
      if (isMounted) {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setDimensions({ width: 4, height: 3 }); // Fallback ratio
      }
    };

    return () => {
      isMounted = false;
    };
  }, [shouldLoad, evidence.img_url]);

  // Dynamically compute aspect ratio once known, otherwise use a stable placeholder min-height
  const containerStyle = dimensions 
    ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
    : { minHeight: '220px' };

  return (
    <div className={`image-variant ${imageEvidence['polaroid-style']}`} ref={containerRef}>
      {/* 3D red push-pin anchoring the photo */}
      <div className={imageEvidence['red-push-pin']} aria-hidden="true"></div>

      {/* The photo frame */}
      <div className={imageEvidence['photo-frame']} style={containerStyle}>
        {evidence.img_url ? (
          <>
            {/* Skeleton Loader: Active only after the component enters viewport threshold */}
            {shouldLoad && !isLoaded && <div className={imageEvidence['image-skeleton-loader']} />}
            
            {/* Only mount the actual image source once allowed by the observer */}
            {shouldLoad && (
              <img 
                src={evidence.img_url} 
                alt={evidence.title} 
                className={imageEvidence['actual-photo']} 
                onLoad={() => setIsLoaded(true)}
                style={{
                  opacity: isLoaded ? 1 : 0,
                }}
              />
            )}
          </>
        ) : (
          <div className={imageEvidence['photo-placeholder']}>
            <span>{t('pages.gameRoom.evidence.variants.image.noImage')}</span>
          </div>
        )}

        {/* Glossy reflection overlay */}
        <div className={imageEvidence['photo-glare']} aria-hidden="true"></div>
      </div>

      {/* Caption */}
      <div className={imageEvidence['photo-caption']}>
        <h4 className={imageEvidence['evidence-title']}>{evidence.title}</h4>
        {evidence.description && <p className={imageEvidence['evidence-desc']}>{evidence.description}</p>}
      </div>
    </div>
  );
}