import type { FC } from 'react';
import DOMPurify from 'dompurify';
import type { TextBlockProps } from '@/types/evidence';
import styles from './TextParagraph.module.css';

export type TextParagraphProps = TextBlockProps;

/**
 * Renders a text block's stored HTML.
 *
 * The server already runs this through its sanitizer before persisting, so the
 * markup here is expected to be clean. It is sanitized again on the way out
 * anyway: a stored payload is data, and a sanitizer bypass or a direct write to
 * the column would otherwise become script execution in every player's browser.
 */
const TextParagraph: FC<TextParagraphProps> = ({ html, align, size }) => {
  const alignmentClass = styles[`align-${align}`] ?? styles['align-left'];
  const sizeClass = styles[`size-${size}`] ?? styles['size-body'];

  return (
    <div
      className={`${styles.paragraph} ${alignmentClass} ${sizeClass}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
};

export default TextParagraph;
