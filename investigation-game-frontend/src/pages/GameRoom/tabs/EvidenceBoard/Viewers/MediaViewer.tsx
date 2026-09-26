import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MediaEvidenceDetail } from '@/types/evidence';
import ViewersContainer from './ViewersContainer';
import './MediaViewer.css';

export interface MediaViewerProps {
  evidence: MediaEvidenceDetail;
}

/**
 * Renders the single file a media evidence carries.
 *
 * The asset is read from the server's `media` lookup rather than from a pair of
 * nullable url columns, so a media evidence always has a declared kind and the
 * viewer never has to infer one from the evidence type.
 */
/**
 * Intrinsic size of a loaded image, tagged with the url it describes.
 *
 * The tag replaces a reset inside the effect: a stale measurement is detected by
 * comparison, so switching files never has to synchronously clear state first.
 */
type ImageMeasurement = { url: string; width: number; height: number };

const MediaViewer: React.FC<MediaViewerProps> = ({ evidence }) => {
  const { t } = useTranslation();
  const [measurement, setMeasurement] = useState<ImageMeasurement | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const image = evidence.media.image;
  const audio = evidence.media.audio;
  const asset = image ?? audio;
  const mediaUrl = asset?.url ?? null;

  useEffect(() => {
    if (!image?.url) return;

    let isMounted = true;

    const img = new Image();
    img.src = image.url;

    img.onload = () => {
      if (isMounted) {
        setMeasurement({ url: image.url, width: img.naturalWidth, height: img.naturalHeight });
        setLoadedUrl(image.url);
      }
    };
    img.onerror = () => {
      if (isMounted) {
        // A broken image still gets a box, so the plaque below it stays readable
        // instead of collapsing the layout.
        setMeasurement({ url: image.url, width: 16, height: 9 });
        setLoadedUrl(image.url);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [image?.url]);

  const isImageLoaded = loadedUrl === image?.url;
  const dimensions = measurement?.url === image?.url ? measurement : null;

  if (!mediaUrl) {
    return (
      <ViewersContainer>
        <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          {t('pages.gameRoom.evidence.viewers.media.noMediaFound', 'No media attached to this evidence.')}
        </div>
      </ViewersContainer>
    );
  }

  const containerStyle = dimensions
    ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
    : { minHeight: '300px' };

  return (
    <ViewersContainer>
      <div className="media-viewer-wrapper">
        {image ? (
          <div className="media-image-container" style={containerStyle}>
            {!isImageLoaded && <div className="media-skeleton-loader" />}

            <img
              src={image.url}
              alt={evidence.title || t('pages.gameRoom.evidence.viewers.media.imageAltFallback', 'Evidence image')}
              className="media-full-image"
              onLoad={() => setLoadedUrl(image.url)}
              draggable={false}
              style={{
                opacity: isImageLoaded ? 1 : 0,
              }}
            />
          </div>
        ) : (
          <div className="media-audio-container">
            <div className="audio-visualizer-mock"></div>
            <audio controls className="media-audio-player">
              {/* The stored mime is used rather than a hard-coded one so an
                  uploaded wav or ogg still reports correctly to the player. */}
              <source src={mediaUrl} type={asset?.mime ?? 'audio/mpeg'} />
              {t('pages.gameRoom.evidence.viewers.media.audioNotSupported', 'Your browser cannot play this audio file.')}
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
    </ViewersContainer>
  );
};

export default MediaViewer;
