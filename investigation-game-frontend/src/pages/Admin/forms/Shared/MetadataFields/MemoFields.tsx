import { AdminRow, AdminInput, AdminSelect, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { MemoMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function MemoFields({ metadata, updateMeta }: MetadataFieldProps<MemoMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.memo;

  return (
    <>
      <AdminRow>
        <AdminInput label={t.writtenByLabel} required value={metadata.written_by || ''} onChange={e => updateMeta('written_by', e.target.value)} />
        <AdminSelect
          label={t.styleLabel}
          value={metadata.style || 'notebook'}
          onChange={e => updateMeta('style', e.target.value as 'sticky' | 'notebook')}
          options={[{ value: 'notebook', label: t.notebookOption }, { value: 'sticky', label: t.stickyOption }]}
        />
      </AdminRow>
      <AdminTextarea label={t.contextLabel} required value={metadata.context || ''} onChange={e => updateMeta('context', e.target.value)} />
    </>
  );
}