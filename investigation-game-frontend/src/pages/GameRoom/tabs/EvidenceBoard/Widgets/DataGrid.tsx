import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import styles from './DataGrid.module.css';

export interface DataGridProps {
  headers: string[];
  rows: (string | number)[][];
  emptyMessage?: string;
}

const DataGrid: FC<DataGridProps> = ({ headers, rows, emptyMessage }) => {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return (
      <p className={styles['empty-message']}>
        {emptyMessage ?? t('pages.gameRoom.evidence.widgets.dataGrid.emptyData', 'No data available')}
      </p>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
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
    </div>
  );
};

export default DataGrid;