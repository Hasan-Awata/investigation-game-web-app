import type { FC } from 'react';
import styles from './KeyValueGrid.module.css';

export interface KeyValueItem {
  label: string;
  value: string;
  isHighlight?: boolean;
}

export interface KeyValueGridProps {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3;
}

const COLUMN_CLASS: Record<1 | 2 | 3, string> = {
  1: styles['columns-1'],
  2: styles['columns-2'],
  3: styles['columns-3'],
};

const KeyValueGrid: FC<KeyValueGridProps> = ({ items, columns = 2 }) => {
  return (
    <div className={`${styles.wrapper} ${COLUMN_CLASS[columns]}`}>
      {items.map((item, index) => (
        <div key={index} className={item.isHighlight ? `${styles.item} ${styles['item-highlight']}` : styles.item}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default KeyValueGrid;