import { AdminRow, AdminInput, AdminSelect, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { MemoMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';

export default function MemoFields({ metadata, updateMeta }: MetadataFieldProps<MemoMetadata>) {
  return (
    <>
      <AdminRow>
        <AdminInput label="Written By" required value={metadata.written_by || ''} onChange={e => updateMeta('written_by', e.target.value)} />
        <AdminSelect
          label="Presentation Style"
          value={metadata.style || 'notebook'}
          onChange={e => updateMeta('style', e.target.value as 'sticky' | 'notebook')}
          options={[{ value: 'notebook', label: 'Notebook Page' }, { value: 'sticky', label: 'Sticky Note' }]}
        />
      </AdminRow>
      <AdminTextarea label="Memo Context" required value={metadata.context || ''} onChange={e => updateMeta('context', e.target.value)} />
    </>
  );
}