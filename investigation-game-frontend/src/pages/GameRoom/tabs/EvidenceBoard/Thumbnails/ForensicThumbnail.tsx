import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { EvidenceBoardEntry } from '@/types/evidence';
import styles from './ForensicThumbnail.module.css';

interface ForensicThumbnailProps {
  evidence: EvidenceBoardEntry;
}

const ForensicThumbnail: FC<ForensicThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.folder}>
        <div className={styles.tab} />
        <div className={styles.face}>
          <div className={styles.cross}>
            <span className={styles.crossV} />
            <span className={styles.crossH} />
          </div>
          <span className={styles.biohazard}>
            {t('pages.gameRoom.evidence.thumbnails.forensic.warning', 'MEDICAL EXAMINER')}
          </span>
          <span className={styles.fileLine} />
          <span className={styles.fileLine} />
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.forensic.label', 'FORENSIC REPORT')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default ForensicThumbnail;