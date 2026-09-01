import { AdminRow, AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { DigitalForensicsMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function DigitalForensicsFields({ metadata, updateMeta }: MetadataFieldProps<DigitalForensicsMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.digitalForensics;

  return (
    <>
      <AdminRow>
        <AdminInput label={t.deviceTypeLabel} required value={metadata.device_type || ''} onChange={e => updateMeta('device_type', e.target.value)} />
        <AdminInput label={t.extractionMethodLabel} required value={metadata.extraction_method || ''} onChange={e => updateMeta('extraction_method', e.target.value)} />
      </AdminRow>
      <AdminTextarea label={t.recoveredDataLabel} required value={metadata.recovered_data || ''} onChange={e => updateMeta('recovered_data', e.target.value)} />
    </>
  );
}