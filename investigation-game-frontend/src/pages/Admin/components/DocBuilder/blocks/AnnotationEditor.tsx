import { AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function AnnotationEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminTextarea
        label="Text"
        value={props.text || ''}
        onChange={(e) => onUpdate({ props: { ...props, text: e.target.value } })}
        minHeight="80px"
        placeholder="Handwritten note text"
      />
      <AdminInput
        label="Rotation (deg)"
        type="number"
        value={props.rotate || -3}
        onChange={(e) => onUpdate({ props: { ...props, rotate: Number(e.target.value) } })}
        min={-45}
        max={45}
      />
    </div>
  );
}