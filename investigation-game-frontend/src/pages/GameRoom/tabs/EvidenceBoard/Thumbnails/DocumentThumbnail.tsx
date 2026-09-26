import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { EvidenceBoardEntry } from '@/types/evidence';
import styles from './DocumentThumbnail.module.css';

interface DocumentThumbnailProps {
  evidence: EvidenceBoardEntry;
}

const DocumentThumbnail: FC<DocumentThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.folder}>
        <div className={styles.tab} />
        <div className={styles.folderFace}>
          <span className={styles.fileLines}>
            <span className={styles.fileLine} />
            <span className={styles.fileLine} />
            <span className={styles.fileLine} />
          </span>
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.document', 'WRITTEN DOCUMENT')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default DocumentThumbnail;