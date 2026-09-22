import type { FC, CSSProperties } from 'react';
import styles from './Barcode.module.css';

export interface BarcodeProps {
  value: string;
}

const Barcode: FC<BarcodeProps> = ({ value }) => {
  const bars: CSSProperties[] = [];

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const width = 1 + (code % 4);
    const gap = 2 + ((code * 7 + i) % 3);
    bars.push({ width, marginRight: gap });
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.bars}>
        {bars.map((bar, index) => (
          <span key={index} className={styles.bar} style={bar} />
        ))}
      </div>
      <div className={styles.text}>{value}</div>
    </div>
  );
};

export default Barcode;