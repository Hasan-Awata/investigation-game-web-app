import type { FC } from 'react';
import styles from './DnaBands.module.css';

export interface DnaBandsProps {
  seed: number;
  hasMatch: boolean;
}

const BAND_COUNT = 24;

const DnaBands: FC<DnaBandsProps> = ({ seed, hasMatch }) => {
  const laneOpacity = (index: number, isMatch: boolean) => {
    const raw = ((seed * (index + 1) * 17) % 100) / 100;
    return isMatch ? raw : ((seed * (index + 1) * 23) % 100) / 100;
  };

  const renderLane = (matches: boolean) => (
    <div className={styles['bands-container']}>
      {Array.from({ length: BAND_COUNT }, (_, i) => (
        <div
          key={i}
          className={`${styles.band} ${laneOpacity(i, matches) > 0.5 ? styles['band-dense'] : ''}`}
          style={{ opacity: laneOpacity(i, matches) }}
        />
      ))}
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.lane}>
        <span className={styles.laneLabel}>Crime Scene Sample</span>
        {renderLane(true)}
      </div>
      <div className={`${styles.lane} ${styles['lane-match']}`}>
        <span className={styles.laneLabel}>Database Record</span>
        {renderLane(hasMatch)}
      </div>
      <div className={`${styles.matchBadge} ${hasMatch ? '' : styles.matchBadgeNoMatch}`}>
        {hasMatch ? 'MATCH CONFIRMED' : 'NO MATCH'}
      </div>
    </div>
  );
};

export default DnaBands;