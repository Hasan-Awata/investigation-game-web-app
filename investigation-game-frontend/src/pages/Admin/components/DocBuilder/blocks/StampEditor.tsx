import { AdminInput, AdminSelect } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function StampEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminInput
        label="Text"
        value={props.text || ''}
        onChange={(e) => onUpdate({ props: { ...props, text: e.target.value } })}
      />
      <AdminSelect
        label="Tone"
        value={props.tone || 'official'}
        onChange={(e) => onUpdate({ props: { ...props, tone: e.target.value } })}
        options={[
          { label: 'Official', value: 'official' },
          { label: 'Forged', value: 'forged' },
          { label: 'Confidential', value: 'confidential' },
          { label: 'Crimson', value: 'crimson' },
        ]}
      />
    </div>
  );
}