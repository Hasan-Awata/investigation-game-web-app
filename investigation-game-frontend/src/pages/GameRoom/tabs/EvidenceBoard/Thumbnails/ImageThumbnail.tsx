import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { Evidence } from '@/types/evidence';
import styles from './ImageThumbnail.module.css';

interface ImageThumbnailProps {
  evidence: Evidence;
}

const ImageThumbnail: FC<ImageThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.polaroid}>
        <div className={styles.pin} />
        <div className={styles.photo}>
          {evidence.img_url ? (
            <img src={evidence.img_url} alt={evidence.title} className={styles.image} />
          ) : (
            <div className={styles.placeholder}>
              {evidence.title ? '' : t('pages.gameRoom.evidence.thumbnails.image.placeholder', 'NO IMAGE')}
            </div>
          )}
          <div className={styles.gloss} />
        </div>
        <div className={styles.caption}>
          {t('pages.gameRoom.evidence.thumbnails.image.caption', 'EVIDENCE PHOTO')}
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.image', 'PHOTOGRAPH')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default ImageThumbnail;