import { AdminInput, AdminSelect, DynamicListHeader, RemoveButton } from '@/pages/Admin/components/AdminUI';
import { useDynamicList } from '@/hooks/useDynamicList';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

interface MetaRow {
  label: string;
  value: string;
}

export function MetaGridEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  const rows = (props.rows || []) as MetaRow[];

  const { items, add, update, remove } = useDynamicList(rows, (newRows) =>
    onUpdate({ props: { ...props, rows: newRows } })
  );

  const handleAdd = () => add({ label: '', value: '' });

  return (
    <div className="block-editor">
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <AdminSelect
          label="Tone"
          value={props.tone || 'rows'}
          onChange={(e) => onUpdate({ props: { ...props, tone: e.target.value } })}
          options={[
            { label: 'Rows', value: 'rows' },
            { label: 'Boxed', value: 'boxed' },
            { label: 'Plain', value: 'plain' },
          ]}
        />
        <AdminInput
          label="Columns"
          type="number"
          value={props.columns || 2}
          onChange={(e) => onUpdate({ props: { ...props, columns: Math.min(4, Math.max(1, Number(e.target.value))) } })}
          min={1}
          max={4}
        />
      </div>

      <DynamicListHeader title="Field Rows" onAdd={handleAdd} addLabel="+ Add Row" />

      {items.map((row, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <AdminInput
            label="Label"
            value={row.label}
            onChange={(e) => update(index, 'label', e.target.value)}
            placeholder="e.g., To, From, Date"
          />
          <AdminInput
            label="Value"
            value={row.value}
            onChange={(e) => update(index, 'value', e.target.value)}
            placeholder="Value"
          />
          <RemoveButton
            onClick={() => remove(index)}
            title="Remove row"
            style={{ height: '38px' }}
          />
        </div>
      ))}

      {items.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          No rows. Click + Add Row to begin.
        </p>
      )}
    </div>
  );
}