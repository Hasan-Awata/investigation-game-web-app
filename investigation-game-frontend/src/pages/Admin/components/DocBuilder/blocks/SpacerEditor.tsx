import { AdminInput } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function SpacerEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminInput
        label="Height (px)"
        type="number"
        value={props.height || 24}
        onChange={(e) => onUpdate({ props: { ...props, height: Math.max(4, Number(e.target.value)) } })}
        min={4}
        max={500}
      />
    </div>
  );
}