import { AdminInput } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function WatermarkEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminInput
        label="Text"
        value={props.text || ''}
        onChange={(e) => onUpdate({ props: { ...props, text: e.target.value } })}
      />
      <AdminInput
        label="Rotation (deg, clockwise)"
        type="number"
        value={props.rotate ?? -15}
        onChange={(e) => onUpdate({ props: { ...props, rotate: Number(e.target.value) } })}
        min={-180}
        max={180}
      />
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
        Rendered behind content. Rotation is mirrored in RTL automatically.
      </p>
    </div>
  );
}