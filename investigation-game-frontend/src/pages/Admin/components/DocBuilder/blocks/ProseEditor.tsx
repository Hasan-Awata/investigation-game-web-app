import { AdminTextarea, AdminSelect, FormattingGuide } from '@/pages/Admin/components/AdminUI';
import type { DocBlock, ProseProps, ProseTone } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock & { type: 'prose'; props: ProseProps };
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

export function ProseEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props;
  return (
    <div className="block-editor">
      <AdminSelect
        label="Tone"
        value={props.tone || 'typed'}
        onChange={(e) => onUpdate({ props: { ...props, tone: e.target.value as ProseTone } })}
        options={[
          { label: 'Typed', value: 'typed' },
          { label: 'Handwritten', value: 'handwritten' },
          { label: 'Monospace', value: 'mono' },
          { label: 'Serif', value: 'serif' },
        ]}
      />
      <AdminTextarea
        label="HTML Content"
        value={props.html || ''}
        onChange={(e) => onUpdate({ props: { ...props, html: e.target.value } })}
        minHeight="150px"
        placeholder='Enter HTML content. Use <span className="redacted">...</span> for redactions.'
      />
      <FormattingGuide />
    </div>
  );
}