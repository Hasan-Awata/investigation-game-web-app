import { AdminRow, AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { CorrespondenceMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function CorrespondenceFields({ metadata, updateMeta }: MetadataFieldProps<CorrespondenceMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.correspondence;

  return (
    <>
      <AdminRow>
        <AdminInput label={t.senderLabel} required value={metadata.sender || ''} onChange={e => updateMeta('sender', e.target.value)} />
        <AdminInput label={t.recipientLabel} required value={metadata.recipient || ''} onChange={e => updateMeta('recipient', e.target.value)} />
      </AdminRow>
      <AdminInput label={t.subjectLabel} required value={metadata.subject || ''} onChange={e => updateMeta('subject', e.target.value)} />
      <AdminTextarea label={t.bodyLabel} required value={metadata.body || ''} onChange={e => updateMeta('body', e.target.value)} />
    </>
  );
}