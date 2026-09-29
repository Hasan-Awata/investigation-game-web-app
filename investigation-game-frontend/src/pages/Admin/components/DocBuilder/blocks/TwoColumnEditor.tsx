import { AdminInput } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function TwoColumnEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <AdminInput
          label="Gap (px)"
          type="number"
          value={props.gap || 16}
          onChange={(e) => onUpdate({ props: { ...props, gap: Math.max(0, Number(e.target.value)) } })}
          min={0}
          max={100}
        />
        <AdminInput
          label="Right Column Width (px, optional)"
          type="number"
          value={props.rightWidth || ''}
          onChange={(e) => onUpdate({ props: { ...props, rightWidth: e.target.value ? Number(e.target.value) : undefined } })}
          min={100}
          max={600}
          placeholder="Leave empty for even split"
        />
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
        Nested blocks are edited by selecting them on the canvas.
      </p>
    </div>
  );
}