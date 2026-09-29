import { AdminInput } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function RedactionEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminInput
        label="Number of bars"
        type="number"
        value={props.lines || 1}
        onChange={(e) => onUpdate({ props: { ...props, lines: Math.max(1, Math.min(10, Number(e.target.value))) } })}
        min={1}
        max={10}
      />
      <AdminInput
        label="Label (optional)"
        value={props.label || ''}
        onChange={(e) => onUpdate({ props: { ...props, label: e.target.value } })}
        placeholder="e.g., Pursuant to Order 4471"
      />
    </div>
  );
}