import { AdminInput, AdminCheckbox, DynamicListHeader, RemoveButton } from '@/pages/Admin/components/AdminUI';
import { useDynamicList } from '@/hooks/useDynamicList';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function ListEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  const items = (props.items || []) as string[];

  const { items: itemList, add, updatePrimitive, remove } = useDynamicList(items, (newItems) =>
    onUpdate({ props: { ...props, items: newItems } })
  );

  const handleAdd = () => add('');

  return (
    <div className="block-editor">
      <AdminCheckbox
        labelTitle="Ordered (numbered)"
        checked={props.ordered || false}
        onChange={(e) => onUpdate({ props: { ...props, ordered: e.target.checked } })}
      />

      <DynamicListHeader title="Items" onAdd={handleAdd} addLabel="+ Add Item" />

      {itemList.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <AdminInput
            value={item}
            onChange={(e) => updatePrimitive(index, e.target.value)}
            placeholder="Item text"
            style={{ flex: 1 }}
          />
          <RemoveButton onClick={() => remove(index)} title="Remove item" style={{ height: '38px' }} />
        </div>
      ))}

      {itemList.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          No items. Click + Add Item to begin.
        </p>
      )}
    </div>
  );
}