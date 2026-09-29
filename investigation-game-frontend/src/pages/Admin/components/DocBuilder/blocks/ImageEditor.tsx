import { AdminInput, AdminSelect, AdminRow } from '@/pages/Admin/components/AdminUI';
import type { DocBlock } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  onUploadImage?: (blockId: string) => void;
  evidenceId: number;
}

export function ImageEditor({ block, onUpdate, onUploadImage }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminInput
        label="Image URL"
        value={props.url || ''}
        onChange={(e) => onUpdate({ props: { ...props, url: e.target.value } })}
        placeholder="Paste URL or click Upload"
      />
      <AdminInput
        label="Caption"
        value={props.caption || ''}
        onChange={(e) => onUpdate({ props: { ...props, caption: e.target.value } })}
      />
      <AdminRow>
        <AdminInput
          label="Width (px)"
          type="number"
          value={props.width || ''}
          onChange={(e) => onUpdate({ props: { ...props, width: e.target.value ? Number(e.target.value) : undefined } })}
          min={50}
          max={800}
          placeholder="Auto"
        />
        <AdminInput
          label="Rotation (deg)"
          type="number"
          value={props.rotate || 0}
          onChange={(e) => onUpdate({ props: { ...props, rotate: Number(e.target.value) } })}
          min={-180}
          max={180}
        />
      </AdminRow>
      <AdminSelect
        label="Filter"
        value={props.filter || 'plain'}
        onChange={(e) => onUpdate({ props: { ...props, filter: e.target.value } })}
        options={[
          { label: 'Plain', value: 'plain' },
          { label: 'Polaroid', value: 'polaroid' },
          { label: 'Mugshot', value: 'mugshot' },
          { label: 'Micrograph', value: 'micrograph' },
        ]}
      />
      {onUploadImage && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onUploadImage(block.id)}
          style={{ marginTop: '0.5rem', alignSelf: 'flex-start', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
        >
          Upload Image
        </button>
      )}
    </div>
  );
}