import type { FC } from 'react';
import styles from './StampOverlay.module.css';

export interface StampOverlayProps {
  text: string;
  variant?: 'red' | 'blue' | 'black';
  rotation?: number;
}

const VARIANT_CLASS: Record<'red' | 'blue' | 'black', string> = {
  red: styles['variant-red'],
  blue: styles['variant-blue'],
  black: styles['variant-black'],
};

const StampOverlay: FC<StampOverlayProps> = ({ text, variant = 'red', rotation = -8 }) => {
  return (
    <div
      className={`${styles.wrapper} ${VARIANT_CLASS[variant]}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {text}
    </div>
  );
};

export default StampOverlay;