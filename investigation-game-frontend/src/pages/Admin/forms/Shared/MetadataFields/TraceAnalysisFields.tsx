import { AdminRow, AdminInput } from '@/pages/Admin/components/AdminUI';
import type { TraceMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function TraceAnalysisFields({ metadata, updateMeta }: MetadataFieldProps<TraceMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.trace;

  return (
    <AdminRow>
      <AdminInput label={t.materialLabel} required value={metadata.material_type || ''} onChange={e => updateMeta('material_type', e.target.value)} />
      <AdminInput label={t.originLabel} required value={metadata.origin_source || ''} onChange={e => updateMeta('origin_source', e.target.value)} />
    </AdminRow>
  );
}