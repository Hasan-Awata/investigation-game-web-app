import type { FC } from 'react';
import styles from './SpectralGraph.module.css';

export interface SpectralGraphProps {
  seed: number;
}

const generatePeaks = (seed: number): string => {
  let points = '0,100 ';
  for (let i = 1; i <= 20; i++) {
    const x = i * 5;
    const isMajorPeak = (seed * i) % 7 === 0;
    const y = isMajorPeak ? 10 + ((seed * i) % 20) : 75 + ((seed * i) % 20);
    points += `${x},${y} `;
  }
  points += '100,100';
  return points;
};

const SpectralGraph: FC<SpectralGraphProps> = ({ seed }) => {
  return (
    <div className={styles.wrapper}>
      <svg viewBox="0 0 100 100" className={styles.graph} preserveAspectRatio="none">
        <line className={styles['grid-line']} x1="0" y1="25" x2="100" y2="25" />
        <line className={styles['grid-line']} x1="0" y1="50" x2="100" y2="50" />
        <line className={styles['grid-line']} x1="0" y1="75" x2="100" y2="75" />

        <polyline points={generatePeaks(seed)} className={styles['data-line-primary']} />
        <polyline points={generatePeaks(seed + 1)} className={styles['data-line-secondary']} />
      </svg>
      <div className={styles.axisLabels}>
        <span>m/z ratio</span>
        <span>relative abundance</span>
      </div>
    </div>
  );
};

export default SpectralGraph;