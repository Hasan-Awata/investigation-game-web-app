import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { MediaEvidence } from '@/types/evidence';
import { assetUrl } from '@/utils/assetUrl';
import ViewersContainer from './ViewersContainer';
import styles from './MediaViewer.module.css';

type ImageState =
  | { status: 'loading' | 'error' }
  | { status: 'loaded'; width: number; height: number };

function EvidenceImage({ src, title }: { src: string; title: string }) {
  const { t } = useTranslation();
  const [image, setImage] = useState<ImageState>({ status: 'loading' });

  if (!src || image.status === 'error') {
    return (
      <div className={styles.imageUnavailable} role="status">
        {t(src
          ? 'pages.gameRoom.evidence.viewers.media.imageLoadFailed'
          : 'pages.gameRoom.evidence.viewers.media.noMediaFound')}
      </div>
    );
  }

  const handleLoad = ({ currentTarget }: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = currentTarget;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      setImage({ status: 'error' });
      return;
    }
    setImage({ status: 'loaded', width: naturalWidth, height: naturalHeight });
  };

  return (
    <div
      className={styles.imageFrame}
      aria-busy={image.status === 'loading'}
      style={{ aspectRatio: image.status === 'loaded' ? image.width + ' / ' + image.height : '16 / 9' }}
    >
      {image.status === 'loading' && <div className={styles.imageSkeleton} aria-hidden="true" />}
      <img
        className={styles.image}
        data-loaded={image.status === 'loaded' || undefined}
        src={src}
        alt={title || t('pages.gameRoom.evidence.viewers.media.imageAltFallback')}
        onLoad={handleLoad}
        onError={() => setImage({ status: 'error' })}
        draggable={false}
      />
    </div>
  );
}

export default function MediaViewer({ evidence }: { evidence: MediaEvidence }) {
  const metadataUrl = evidence.metadata?.url;
  const src = assetUrl(evidence.img_url || (typeof metadataUrl === 'string' ? metadataUrl : ''));

  return (
    <ViewersContainer>
      <div className={styles.viewer}>
        <EvidenceImage key={src} src={src} title={evidence.title} />
        <div className={styles.plaque}>
          <h3 className={styles.title}><bdi>{evidence.title}</bdi></h3>
          {evidence.description && <p className={styles.description} dir="auto">{evidence.description}</p>}
        </div>
      </div>
    </ViewersContainer>
  );
}
