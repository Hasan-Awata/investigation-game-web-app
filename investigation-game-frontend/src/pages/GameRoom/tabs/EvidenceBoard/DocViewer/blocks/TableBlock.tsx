import type { DocBlock, TableColumn, TableRow, TableTone } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'table' }> };

const cellText = (value: string | number | undefined): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return String(value);
};

/**
 * Typed data table. Two tones carry the two distinct table looks:
 * - `ledger` bordered grid on tinted header, per `.financial-table`
 *   (FinancialRecordViewer.css:53-78)
 * - `log`    dark header + zebra striping, per `.telecom-logs-table`
 *   (PhoneRecordsViewer.css:123-149)
 *
 * `type: 'number'` renders bold with negative values in the crimson accent,
 * matching `.financial-table td.amount-col.negative`
 * (FinancialRecordViewer.css:183-185).
 */
export default function TableBlock({ block }: Props) {
  const { columns, rows, tone = 'ledger', caption, emptyMessage } = block.props;
  const safeTone: TableTone = tone === 'log' ? 'log' : 'ledger';

  if (!columns || columns.length === 0) return null;
  if (!rows || rows.length === 0) {
    return emptyMessage ? (
      <div className="db-table-empty">{emptyMessage}</div>
    ) : null;
  }

  const col = (c: TableColumn): React.CSSProperties => ({
    textAlign: c.align === 'end' ? 'end' : c.align === 'center' ? 'center' : 'start',
  });

  return (
    <figure className={`db-table-figure db-table-figure--${safeTone}`}>
      {caption && <figcaption className="db-table-caption">{caption}</figcaption>}

      <table className={`db-table db-table--${safeTone}`}>
        <thead>
          <tr>
              {columns.map((c) => (
                <th key={c.key} style={col(c)} scope="col">
                  {c.label}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: TableRow, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const raw = row[c.key];
                const text = cellText(raw);
                const align = col(c);
                const key = `${i}-${c.key}`;

                if (c.type === 'badge') {
                  const badge = c.tones?.[text] ?? 'default';
                  return (
                    <td key={key} style={align}>
                      <span className={`db-badge db-badge--${badge}`}>{text}</span>
                    </td>
                  );
                }

                if (c.type === 'number') {
                  const numeric = Number(raw);
                  const isNegative = Number.isFinite(numeric) && numeric < 0;
                  return (
                    <td
                      key={key}
                      style={align}
                      className={isNegative ? 'db-table-num db-table-num--negative' : 'db-table-num'}
                    >
                      {text}
                    </td>
                  );
                }
                return (
                  <td key={key} style={align} className={c.type === 'mono' ? 'db-table-mono' : undefined}>
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
