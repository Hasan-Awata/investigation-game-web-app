import type { FC } from 'react';
import styles from './TextParagraph.module.css';

export interface TextParagraphProps {
  text: string;
  isBold?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

const TextParagraph: FC<TextParagraphProps> = ({ text, isBold = false, alignment = 'left' }) => {
  const alignmentClass = styles[`align-${alignment}`] ?? styles['align-left'];

  return (
    <p className={`${styles.paragraph} ${isBold ? styles['is-bold'] : ''} ${alignmentClass}`}>
      {text}
    </p>
  );
};

export default TextParagraph;