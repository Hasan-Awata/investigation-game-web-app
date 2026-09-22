import type { FC } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import styles from './RawHtml.module.css';

export interface RawHtmlProps {
  html: string;
}

const RawHtml: FC<RawHtmlProps> = ({ html }) => {
  return <div className={styles.wrapper} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
};

export default RawHtml;