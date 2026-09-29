import { AdminInput, AdminSelect, DynamicListHeader, RemoveButton } from '@/pages/Admin/components/AdminUI';
import { useDynamicList } from '@/hooks/useDynamicList';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

interface TableColumn {
  key: string;
  label: string;
  align?: 'start' | 'center' | 'end';
  type?: 'text' | 'number' | 'mono' | 'badge';
  tones?: Record<string, string>;
}

interface TableRow {
  [key: string]: string | number;
}

export function TableEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  const columns = (props.columns || []) as TableColumn[];
  const rows = (props.rows || []) as TableRow[];

  const { items: columnItems, add: addColumn, update: updateColumn, remove: removeColumn } = useDynamicList(columns, (newCols) =>
    onUpdate({ props: { ...props, columns: newCols } })
  );

  const { items: rowItems, add: addRow, remove: removeRow } = useDynamicList(rows, (newRows) =>
    onUpdate({ props: { ...props, rows: newRows } })
  );

  const handleAddColumn = () => addColumn({ key: `col${columns.length + 1}`, label: `Column ${columns.length + 1}`, type: 'text' });
  const handleAddRow = () => {
    const newRow: TableRow = {};
    columns.forEach(c => { newRow[c.key] = ''; });
    addRow(newRow);
  };

  return (
    <div className="block-editor">
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <AdminSelect
          label="Tone"
          value={props.tone || 'ledger'}
          onChange={(e) => onUpdate({ props: { ...props, tone: e.target.value } })}
          options={[
            { label: 'Ledger', value: 'ledger' },
            { label: 'Log', value: 'log' },
          ]}
        />
        <AdminInput
          label="Caption"
          value={props.caption || ''}
          onChange={(e) => onUpdate({ props: { ...props, caption: e.target.value } })}
        />
      </div>

      <DynamicListHeader title="Columns" onAdd={handleAddColumn} addLabel="+ Add Column" />

      {columnItems.map((col, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <AdminInput
            label="Key"
            value={col.key}
            onChange={(e) => updateColumn(index, 'key', e.target.value)}
            placeholder="key"
          />
          <AdminInput
            label="Label"
            value={col.label}
            onChange={(e) => updateColumn(index, 'label', e.target.value)}
            placeholder="Header"
          />
          <AdminSelect
            label="Align"
            value={col.align || 'start'}
            onChange={(e) => updateColumn(index, 'align', e.target.value)}
            options={[
              { label: 'Start', value: 'start' },
              { label: 'Center', value: 'center' },
              { label: 'End', value: 'end' },
            ]}
          />
          <AdminSelect
            label="Type"
            value={col.type || 'text'}
            onChange={(e) => updateColumn(index, 'type', e.target.value)}
            options={[
              { label: 'Text', value: 'text' },
              { label: 'Number', value: 'number' },
              { label: 'Monospace', value: 'mono' },
              { label: 'Badge', value: 'badge' },
            ]}
          />
          <RemoveButton onClick={() => removeColumn(index)} title="Remove column" style={{ height: '38px' }} />
        </div>
      ))}

      <DynamicListHeader title="Rows" onAdd={handleAddRow} addLabel="+ Add Row" />

      {rowItems.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {columns.map((col, colIndex) => (
              <AdminInput
                key={colIndex}
                label={col.label}
                value={String(row[col.key] || '')}
                onChange={(e) => {
                  const newRows = [...rows];
                  newRows[rowIndex] = { ...newRows[rowIndex], [col.key]: e.target.value };
                  onUpdate({ props: { ...props, rows: newRows } });
                }}
                placeholder={col.type === 'number' ? '0' : '...'}
                style={{ minWidth: '120px', flex: 1 }}
              />
            ))}
            <RemoveButton onClick={() => removeRow(rowIndex)} title="Remove row" style={{ height: '38px', alignSelf: 'flex-end' }} />
          </div>
        </div>
      ))}

      {rowItems.length === 0 && columns.length > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          No rows. Click + Add Row to begin.
        </p>
      )}

      {columns.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Add columns first, then rows will follow their structure.
        </p>
      )}
    </div>
  );
}