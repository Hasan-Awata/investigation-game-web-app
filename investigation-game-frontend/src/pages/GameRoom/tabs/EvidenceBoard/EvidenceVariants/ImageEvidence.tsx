import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types';
import { assetUrl } from '@/utils/assetUrl';
import imageEvidence from './ImageEvidence.module.css';

function PhotoPreview({ imageUrl, title }: { imageUrl: string; title: string }) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (!frameRef.current || !imageUrl) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { root: null, rootMargin: '200px' });
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [imageUrl]);

  return (
    <div className={imageEvidence['photo-frame']} ref={frameRef}>
      {!imageUrl || status === 'error' ? (
        <div className={imageEvidence['photo-placeholder']}>
          <span>{t('pages.gameRoom.evidence.variants.image.noImage')}</span>
        </div>
      ) : shouldLoad && (
        <>
          {status === 'loading' && <div className={imageEvidence['image-skeleton-loader']} />}
          <img
            src={imageUrl}
            alt={title}
            className={imageEvidence['actual-photo']}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            style={{ opacity: status === 'loaded' ? 1 : 0 }}
          />
        </>
      )}
      <div className={imageEvidence['photo-glare']} aria-hidden="true" />
    </div>
  );
}

export default function ImageEvidence({ evidence }: { evidence: Evidence }) {
  const metadataUrl = (evidence.metadata as Record<string, unknown> | null | undefined)?.url;
  const rawImgUrl = evidence.img_url || (typeof metadataUrl === 'string' ? metadataUrl : '');
  const imageUrl = rawImgUrl ? assetUrl(rawImgUrl) : '';

  return (
    <div className={`image-variant ${imageEvidence['polaroid-style']}`}>
      <div className={imageEvidence['red-push-pin']} aria-hidden="true" />
      <PhotoPreview key={imageUrl} imageUrl={imageUrl} title={evidence.title} />
      <div className={imageEvidence['photo-caption']}>
        <h4 className={imageEvidence['evidence-title']}>{evidence.title}</h4>
        {evidence.description && <p className={imageEvidence['evidence-desc']}>{evidence.description}</p>}
      </div>
    </div>
  );
}
