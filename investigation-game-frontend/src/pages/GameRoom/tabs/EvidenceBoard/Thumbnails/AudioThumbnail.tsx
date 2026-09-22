import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { Evidence } from '@/types/evidence';
import styles from './AudioThumbnail.module.css';

interface AudioThumbnailProps {
  evidence: Evidence;
}

const AudioThumbnail: FC<AudioThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.cassette}>
        {/* Printed directly on the dark plastic casing */}
        <div className={styles.cassetteTopArea}>
          <div className={styles.labelHeader}>
            <span className={styles.audioIcon} />
            <span className={styles.tapeIndicator}>
              {t('pages.gameRoom.evidence.variants.audio.aSide', 'SIDE A')}
            </span>
          </div>
        </div>

        {/* The clear plastic window showing the tape spools */}
        <div className={styles.window}>
          <div className={`${styles.reel} ${styles.leftReel}`} />
          <div className={`${styles.reel} ${styles.rightReel}`} />
        </div>

        {/* The bottom mechanical casing */}
        <div className={styles.cassetteBottom}>
          <div className={styles.leftScrew} />
          <div className={styles.rightScrew} />
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.audio', 'AUDIO RECORDING')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default AudioThumbnail;