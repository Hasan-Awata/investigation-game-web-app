import { AdminSelect } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function RuleEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminSelect
        label="Variant"
        value={props.variant || 'solid'}
        onChange={(e) => onUpdate({ props: { ...props, variant: e.target.value } })}
        options={[
          { label: 'Solid', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' },
          { label: 'Double', value: 'double' },
        ]}
      />
    </div>
  );
}