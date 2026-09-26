import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { EvidenceBoardEntry } from '@/types/evidence';
import styles from './CustomThumbnail.module.css';

interface CustomThumbnailProps {
  evidence: EvidenceBoardEntry;
}

/**
 * A custom evidence renders as a sandboxed artifact, so the card shows a dark
 * terminal-like slab rather than a paper folder. It is deliberately distinct
 * from the written-document thumbnail: the two open into very different
 * viewers, and a custom artifact mislabelled as a document reads as a bug.
 */
const CustomThumbnail: FC<CustomThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.slab}>
        <div className={styles.glow} />
        <div className={styles.slabFace}>
          <span className={styles.chevron}>&gt;_</span>
          <span className={styles.grip} />
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.custom', 'CUSTOM ARTIFACT')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default CustomThumbnail;
