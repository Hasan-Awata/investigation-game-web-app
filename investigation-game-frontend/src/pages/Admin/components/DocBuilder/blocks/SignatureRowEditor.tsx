import { AdminInput, DynamicListHeader, RemoveButton } from '@/pages/Admin/components/AdminUI';
import { useDynamicList } from '@/hooks/useDynamicList';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

interface SignatureColumn {
  caption: string;
}

export function SignatureRowEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  const columns = (props.columns || []) as SignatureColumn[];

  const { items, add, update, remove } = useDynamicList(columns, (newCols) =>
    onUpdate({ props: { ...props, columns: newCols } })
  );

  const handleAdd = () => add({ caption: '' });

  return (
    <div className="block-editor">
      <DynamicListHeader title="Signature Columns" onAdd={handleAdd} addLabel="+ Add Column" />

      {items.map((col, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <AdminInput
            label="Caption"
            value={col.caption}
            onChange={(e) => update(index, 'caption', e.target.value)}
            placeholder="e.g., Signed, Witness"
            style={{ flex: 1 }}
          />
          <RemoveButton onClick={() => remove(index)} title="Remove column" style={{ height: '38px' }} />
        </div>
      ))}

      {items.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          No columns. Click + Add Column to begin.
        </p>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '1rem' }}>
        Signatures use procedural assets seeded from evidence ID (1-18).
      </p>
    </div>
  );
}