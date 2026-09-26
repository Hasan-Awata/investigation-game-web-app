import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import type { TableBlockProps } from '@/types/evidence';
import styles from './DataGrid.module.css';

export type DataGridProps = TableBlockProps;

const DataGrid: FC<DataGridProps> = ({ headers, rows, caption, dense }) => {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <p className={styles['empty-message']}>
        {t('pages.gameRoom.evidence.widgets.dataGrid.emptyData', 'No data available')}
      </p>
    );
  }

  return (
    <figure className={`${styles.wrapper} ${dense ? styles.dense : ''}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((header, headerIndex) => (
              // Headers are author-supplied and may legitimately repeat, so the
              // index is part of the key rather than the label alone.
              <th key={`${headerIndex}-${header}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
};

export default DataGrid;