import type { FC } from 'react';
import type { StampBlockProps } from '@/types/evidence';
import styles from './StampOverlay.module.css';

export type StampOverlayProps = StampBlockProps;

const VARIANT_CLASS: Record<'red' | 'blue' | 'black', string> = {
  red: styles['variant-red'],
  blue: styles['variant-blue'],
  black: styles['variant-black'],
};

const FONT_SIZE_CLASS: Record<'auto' | 'small' | 'medium' | 'large', string> = {
  auto: styles['font-auto'],
  small: styles['font-small'],
  medium: styles['font-medium'],
  large: styles['font-large'],
};

const StampOverlay: FC<StampOverlayProps> = ({ text, variant, rotation, font_size }) => {
  return (
    <div
      className={`${styles.wrapper} ${styles.stamp} ${VARIANT_CLASS[variant]} ${FONT_SIZE_CLASS[font_size]}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {text}
    </div>
  );
};

export default StampOverlay;
