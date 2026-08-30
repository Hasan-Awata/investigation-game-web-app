import { AdminRow, AdminInput, AdminSelect, AdminTextarea } from '@/components/AdminUI';

interface MemoFieldsProps {
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function MemoFields({ metadata, updateMeta }: MemoFieldsProps) {
  return (
    <>
      <AdminRow>
        <AdminInput label="Written By" required value={metadata.written_by || ''} onChange={e => updateMeta('written_by', e.target.value)} />
        <AdminSelect
          label="Presentation Style"
          value={metadata.style || 'notebook'}
          onChange={e => updateMeta('style', e.target.value)}
          options={[{ value: 'notebook', label: 'Notebook Page' }, { value: 'sticky', label: 'Sticky Note' }]}
        />
      </AdminRow>
      <AdminTextarea label="Memo Context" required value={metadata.context || ''} onChange={e => updateMeta('context', e.target.value)} />
    </>
  );
}