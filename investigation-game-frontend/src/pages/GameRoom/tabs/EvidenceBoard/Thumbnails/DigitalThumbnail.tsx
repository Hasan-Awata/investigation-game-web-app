import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { EvidenceBoardEntry } from '@/types/evidence';
import styles from './DigitalThumbnail.module.css';

interface DigitalThumbnailProps {
  evidence: EvidenceBoardEntry;
}

const DigitalThumbnail: FC<DigitalThumbnailProps> = ({ evidence }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.drive}>
        <div className={styles.monitor}>
          <div className={styles.titleBar}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.promptLabel}>
              {t('pages.gameRoom.evidence.thumbnails.digital.prompt', 'EVIDENCE_EXTRACT')}
            </span>
          </div>
          <div className={styles.screen}>
            <span className={styles.cmdLine}>{t('pages.gameRoom.evidence.thumbnails.digital.line1', '> DECRYPTING MEDIA...')}</span>
            <span className={styles.cmdLine}>{t('pages.gameRoom.evidence.thumbnails.digital.line2', '> CHAIN OK [SHA-256]')}</span>
            <span className={styles.cmdLine}>
              <span className={styles.cursorBlock} />
            </span>
          </div>
        </div>
        <div className={styles.glow} />
      </div>
      <div className={styles.meta}>
        <span className={styles.badge}>{t('pages.gameRoom.evidence.thumbnails.digital.label', 'DIGITAL FORENSICS')}</span>
        <h4 className={styles.title}>{evidence.title}</h4>
      </div>
    </div>
  );
};

export default DigitalThumbnail;