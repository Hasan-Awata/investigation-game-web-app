import { AdminRow, AdminInput } from '@/components/AdminUI';

interface TraceAnalysisFieldsProps {
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function TraceAnalysisFields({ metadata, updateMeta }: TraceAnalysisFieldsProps) {
  return (
    <AdminRow>
      <AdminInput label="Material Composition" required value={metadata.material_type || ''} onChange={e => updateMeta('material_type', e.target.value)} />
      <AdminInput label="Identified Origin Source" required value={metadata.origin_source || ''} onChange={e => updateMeta('origin_source', e.target.value)} />
    </AdminRow>
  );
}