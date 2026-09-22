import type { FC } from 'react';
import styles from './AutopsyDiagram.module.css';

export interface AnomalyPoint {
  x: number;
  y: number;
  label: string;
}

export interface AutopsyDiagramProps {
  anomalies?: AnomalyPoint[];
}

const AutopsyDiagram: FC<AutopsyDiagramProps> = ({ anomalies = [] }) => {
  return (
    <div className={styles.wrapper}>
      <svg viewBox="0 0 100 220" className={styles.wireframe} preserveAspectRatio="none">
        <circle className={styles.outline} cx="50" cy="25" r="14" />
        <path className={styles.outline} d="M35 50 Q50 45 65 50 L60 110 L40 110 Z" />
        <path className={styles.outline} d="M30 55 Q20 80 15 110" />
        <path className={styles.outline} d="M70 55 Q80 80 85 110" />
        <path className={styles.outline} d="M42 115 L40 195" />
        <path className={styles.outline} d="M58 115 L60 195" />

        {anomalies.map((anomaly, idx) => (
          <g key={idx} className={styles.anomaly}>
            <circle
              className={styles['anomaly-dot']}
              cx={anomaly.x}
              cy={anomaly.y}
              r="2.5"
            />
            <text
              x={anomaly.x}
              y={anomaly.y - 4}
              textAnchor="middle"
              className={styles['anomaly-label']}
            >
              {anomaly.label}
            </text>
          </g>
        ))}
      </svg>
      {anomalies.length === 0 && <div className={styles.caption}>No anomalies marked</div>}
    </div>
  );
};

export default AutopsyDiagram;