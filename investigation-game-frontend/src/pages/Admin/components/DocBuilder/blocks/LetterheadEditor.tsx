import { AdminInput, AdminCheckbox } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function LetterheadEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminInput
        label="Agency"
        value={props.agency || ''}
        onChange={(e) => onUpdate({ props: { ...props, agency: e.target.value } })}
      />
      <AdminInput
        label="Title"
        value={props.title || ''}
        onChange={(e) => onUpdate({ props: { ...props, title: e.target.value } })}
      />
      <AdminInput
        label="Subtitle"
        value={props.sub || ''}
        onChange={(e) => onUpdate({ props: { ...props, sub: e.target.value } })}
      />
      <AdminInput
        label="Aside (Case No.)"
        value={props.aside || ''}
        onChange={(e) => onUpdate({ props: { ...props, aside: e.target.value } })}
      />
      <AdminInput
        label="Aside Label"
        value={props.asideLabel || ''}
        onChange={(e) => onUpdate({ props: { ...props, asideLabel: e.target.value } })}
      />
      <AdminCheckbox
        labelTitle="Rule beneath"
        checked={props.rule !== false}
        onChange={(e) => onUpdate({ props: { ...props, rule: e.target.checked } })}
      />
    </div>
  );
}