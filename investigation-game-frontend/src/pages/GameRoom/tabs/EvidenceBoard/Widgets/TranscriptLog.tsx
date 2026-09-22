import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import styles from './TranscriptLog.module.css';

export interface TranscriptLine {
  type: 'q' | 'a';
  speaker: string;
  text: string;
}

export interface TranscriptLogProps {
  lines: TranscriptLine[];
  watermark?: string;
}

const TranscriptLog: FC<TranscriptLogProps> = ({ lines, watermark }) => {
  const { t } = useTranslation();

  const watermarkText = watermark ?? t('pages.gameRoom.evidence.viewers.testimony.watermark');

  return (
    <div className={styles.container}>
      <div className={styles.watermark}>{watermarkText}</div>
      <div className={styles.content}>
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`${styles['transcript-line']} ${line.type === 'q' ? styles['transcript-q'] : styles['transcript-a']}`}
          >
            <span className={styles['speaker-tag']}>{line.speaker}:</span>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptLog;