import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { Evidence } from '@/types/evidence';
import styles from './TestimonyThumbnail.module.css';

interface TestimonyThumbnailProps {
  evidence: Evidence;
}

const TestimonyThumbnail: FC<TestimonyThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.stack}>
        <div className={`${styles.sheet} ${styles.sheetBack}`} />
        <div className={`${styles.sheet} ${styles.sheetMid}`} />
        <div className={`${styles.sheet} ${styles.sheetFront}`}>
          <span className={styles.scriptLine} />
          <span className={styles.scriptLine} />
          <span className={styles.scriptLine} />
          <div className={styles.stamp}>
            {t('pages.gameRoom.evidence.thumbnails.testimony.stamp', 'TRANSCRIPT')}
          </div>
        </div>
        <div className={styles.paperclip} />
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.testimony', 'TESTIMONY')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default TestimonyThumbnail;