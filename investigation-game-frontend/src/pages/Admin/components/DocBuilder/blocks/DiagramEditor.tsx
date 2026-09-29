import { AdminSelect, AdminInput } from '@/pages/Admin/components/AdminUI';
import type { DocBlock, DiagramPreset } from '@/types/evidence/doc';

interface BlockEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

const PRESET_LABELS: Record<DiagramPreset, string> = {
  body_outline: 'Body Outline',
  fingerprint: 'Fingerprint',
  electropherogram: 'Electropherogram (DNA)',
  mass_spec: 'Mass Spectrum',
};

export function DiagramEditor({ block, onUpdate }: BlockEditorProps) {
  const props = block.props as any;
  return (
    <div className="block-editor">
      <AdminSelect
        label="Preset"
        value={props.preset || 'body_outline'}
        onChange={(e) => onUpdate({ props: { ...props, preset: e.target.value } })}
        options={Object.entries(PRESET_LABELS).map(([value, label]) => ({ label, value }))}
      />
      <AdminInput
        label="Caption"
        value={props.caption || ''}
        onChange={(e) => onUpdate({ props: { ...props, caption: e.target.value } })}
      />
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
        Procedural presets: electropherogram & mass_spec are seeded from evidence ID.
      </p>
    </div>
  );
}