import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { Evidence } from '@/types/evidence';
import styles from './BallisticsThumbnail.module.css';

interface BallisticsThumbnailProps {
  evidence: Evidence;
}

const BallisticsThumbnail: FC<BallisticsThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.bag}>
        <div className={styles.seal}>
          <span className={styles.sealText}>
            {t('pages.gameRoom.evidence.thumbnails.ballistics.seal', 'EVIDENCE')}
          </span>
        </div>
        <div className={styles.shellCase} />
        <div className={styles.barcode}>
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className={styles.bar} style={{ height: `${14 + ((i * 7) % 12)}px` }} />
          ))}
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.ballistics', 'BALLISTICS')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default BallisticsThumbnail;