import { useDynamicList } from '@/hooks/useDynamicList';
import {
  AdminRow, AdminInput, AdminTextarea, AdminCheckbox,
  DynamicListHeader, RemoveButton
} from '@/components/AdminUI';

interface JournalFieldsProps {
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function JournalFields({ metadata, updateMeta }: JournalFieldsProps) {
  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<{page_number: number, date_entry: string, content: string, is_torn: boolean}>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label="Owner / Author" required value={metadata.owner || ''} onChange={e => updateMeta('owner', e.target.value)} />
        <AdminInput label="Cover Title (Optional)" value={metadata.cover_title || ''} onChange={e => updateMeta('cover_title', e.target.value)} placeholder="e.g., Personal Diary" />
      </AdminRow>

      <DynamicListHeader title="JOURNAL PAGES" onAdd={() => addPage({ page_number: pages.length + 1, date_entry: '', content: '', is_torn: false })} addLabel="+ Add Page" />

      {pages.map((page: any, idx: number) => (
        <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '10px', right: '10px', color: '#888', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>PAGE {page.page_number}</span>
          <RemoveButton onClick={() => removePage(idx, 'page_number')} style={{ position: 'absolute', top: '8px', right: '60px' }} />

          <AdminInput label="Date Entry (Optional)" value={page.date_entry || ''} onChange={e => updatePage(idx, 'date_entry', e.target.value)} disabled={page.is_torn} placeholder="e.g., October 14th, 11:00 PM" />
          <AdminTextarea label="Journal Content" value={page.content || ''} onChange={e => updatePage(idx, 'content', e.target.value)} disabled={page.is_torn} required={!page.is_torn} />

          <AdminCheckbox
            checked={!!page.is_torn}
            onChange={e => updatePage(idx, 'is_torn', e.target.checked)}
            labelTitle="MARK AS TORN OUT"
            description="Hides content for gameplay effect"
            accentColor="var(--accent-crimson)"
            bgColor="transparent"
            style={{ marginBottom: 0, padding: 0, border: 'none' }}
          />
        </div>
      ))}
    </>
  );
}