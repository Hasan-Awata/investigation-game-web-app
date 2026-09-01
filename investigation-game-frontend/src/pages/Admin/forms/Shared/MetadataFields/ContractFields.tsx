import { useDynamicList } from '@/hooks/useDynamicList';
import {
  AdminRow, AdminInput, AdminTextarea, AdminCheckbox,
  DynamicListHeader, RemoveButton
} from '@/pages/Admin/components/AdminUI';
import type { ContractMetadata, ContractPage } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function ContractFields({ metadata, updateMeta }: MetadataFieldProps<ContractMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.contract;

  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<ContractPage>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label={t.partiesLabel} required value={metadata.parties_involved ? metadata.parties_involved.join(', ') : ''} onChange={e => updateMeta('parties_involved', e.target.value.split(',').map((s: string) => s.trim()))} placeholder={t.partiesPlaceholder} />
        <AdminInput label={t.executionDateLabel} value={metadata.execution_date || ''} onChange={e => updateMeta('execution_date', e.target.value)} placeholder={t.executionDatePlaceholder} />
      </AdminRow>

      <DynamicListHeader title={t.pagesHeader} onAdd={() => addPage({ page_number: pages.length + 1, terms_text: ''})} addLabel={t.addPageBtn} />

      {pages.map((page: any, idx: number) => (
        <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '10px', right: '10px', color: '#888', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{t.pageNumberLabel(page.page_number)}</span>
          <RemoveButton onClick={() => removePage(idx, 'page_number')} style={{ position: 'absolute', top: '8px', right: '60px' }} />

          <AdminTextarea label={t.termsTextLabel} minHeight="100px" required value={page.terms_text || ''} onChange={e => updatePage(idx, 'terms_text', e.target.value)} />
        </div>
      ))}

      <div style={{ marginTop: '1rem' }}>
        <AdminCheckbox
          checked={!!metadata.signatures_valid}
          onChange={e => updateMeta('signatures_valid', e.target.checked)}
          labelTitle={t.signaturesValidLabel}
          description={t.signaturesValidDesc}
          accentColor="var(--accent-crimson)"
          bgColor="rgba(163, 50, 50, 0.1)"
        />
      </div>
    </>
  );
}