import { AdminRow, AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { DigitalForensicsMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';

export default function DigitalForensicsFields({ metadata, updateMeta }: MetadataFieldProps<DigitalForensicsMetadata>) {
  return (
    <>
      <AdminRow>
        <AdminInput label="Device Classification" required value={metadata.device_type || ''} onChange={e => updateMeta('device_type', e.target.value)} />
        <AdminInput label="Extraction Method" required value={metadata.extraction_method || ''} onChange={e => updateMeta('extraction_method', e.target.value)} />
      </AdminRow>
      <AdminTextarea label="Decrypted Data / Payload" required value={metadata.recovered_data || ''} onChange={e => updateMeta('recovered_data', e.target.value)} />
    </>
  );
}