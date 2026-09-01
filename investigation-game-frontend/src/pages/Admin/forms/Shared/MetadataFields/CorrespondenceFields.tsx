import { AdminRow, AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { CorrespondenceMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';

export default function CorrespondenceFields({ metadata, updateMeta }: MetadataFieldProps<CorrespondenceMetadata>) {
  return (
    <>
      <AdminRow>
        <AdminInput label="Sender (FROM)" required value={metadata.sender || ''} onChange={e => updateMeta('sender', e.target.value)} />
        <AdminInput label="Recipient (TO)" required value={metadata.recipient || ''} onChange={e => updateMeta('recipient', e.target.value)} />
      </AdminRow>
      <AdminInput label="Subject Line" required value={metadata.subject || ''} onChange={e => updateMeta('subject', e.target.value)} />
      <AdminTextarea label="Message Body" required value={metadata.body || ''} onChange={e => updateMeta('body', e.target.value)} />
    </>
  );
}