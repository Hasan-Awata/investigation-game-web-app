import { useDynamicList } from '@/hooks/useDynamicList';
import {
  AdminRow, AdminInput, AdminTextarea, AdminCheckbox,
  DynamicListHeader, RemoveButton
} from '@/pages/Admin/components/AdminUI';
import type { JournalMetadata, JournalPage } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function JournalFields({ metadata, updateMeta }: MetadataFieldProps<JournalMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.journal;

  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<JournalPage>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label={t.ownerLabel} required value={metadata.owner || ''} onChange={e => updateMeta('owner', e.target.value)} />
        <AdminInput label={t.coverTitleLabel} value={metadata.cover_title || ''} onChange={e => updateMeta('cover_title', e.target.value)} placeholder={t.coverTitlePlaceholder} />
      </AdminRow>

      <DynamicListHeader title={t.pagesHeader} onAdd={() => addPage({ page_number: pages.length + 1, date_entry: '', content: '', is_torn: false })} addLabel={t.addPageBtn} />

      {pages.map((page: any, idx: number) => (
        <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '10px', right: '10px', color: '#888', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{t.pageNumberLabel(page.page_number)}</span>
          <RemoveButton onClick={() => removePage(idx, 'page_number')} style={{ position: 'absolute', top: '8px', right: '60px' }} />

          <AdminInput label={t.dateEntryLabel} value={page.date_entry || ''} onChange={e => updatePage(idx, 'date_entry', e.target.value)} disabled={page.is_torn} placeholder={t.dateEntryPlaceholder} />
          <AdminTextarea label={t.contentLabel} value={page.content || ''} onChange={e => updatePage(idx, 'content', e.target.value)} disabled={page.is_torn} required={!page.is_torn} />

          <AdminCheckbox
            checked={!!page.is_torn}
            onChange={e => updatePage(idx, 'is_torn', e.target.checked)}
            labelTitle={t.tornLabel}
            description={t.tornDesc}
            accentColor="var(--accent-crimson)"
            bgColor="transparent"
            style={{ marginBottom: 0, padding: 0, border: 'none' }}
          />
        </div>
      ))}
    </>
  );
}