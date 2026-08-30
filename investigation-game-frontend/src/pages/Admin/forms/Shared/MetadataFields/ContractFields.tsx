import { useDynamicList } from '@/hooks/useDynamicList';
import {
  AdminRow, AdminInput, AdminTextarea, AdminCheckbox,
  DynamicListHeader, RemoveButton
} from '@/components/AdminUI';

interface ContractFieldsProps {
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function ContractFields({ metadata, updateMeta }: ContractFieldsProps) {
  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<{page_number: number, terms_text: string, key_clause: string}>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label="Parties Involved (Comma Separated)" required value={metadata.parties_involved ? metadata.parties_involved.join(', ') : ''} onChange={e => updateMeta('parties_involved', e.target.value.split(',').map((s: string) => s.trim()))} placeholder="e.g., Vance Corp, Thorne LLC" />
        <AdminInput label="Execution Date (Optional)" value={metadata.execution_date || ''} onChange={e => updateMeta('execution_date', e.target.value)} placeholder="e.g., 14-OCT-2023" />
      </AdminRow>

      <DynamicListHeader title="CONTRACT PAGES" onAdd={() => addPage({ page_number: pages.length + 1, terms_text: '', key_clause: '' })} addLabel="+ Add Page" />

      {pages.map((page: any, idx: number) => (
        <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '10px', right: '10px', color: '#888', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>PAGE {page.page_number}</span>
          <RemoveButton onClick={() => removePage(idx, 'page_number')} style={{ position: 'absolute', top: '8px', right: '60px' }} />

          <AdminTextarea label="Terms and Conditions" minHeight="100px" required value={page.terms_text || ''} onChange={e => updatePage(idx, 'terms_text', e.target.value)} />
          <AdminInput label="Critical Clause (Gameplay Clue - Optional)" value={page.key_clause || ''} onChange={e => updatePage(idx, 'key_clause', e.target.value)} placeholder="Highlight a specific suspicious term" />
        </div>
      ))}

      <div style={{ marginTop: '1rem' }}>
        <AdminCheckbox
          checked={!!metadata.signatures_valid}
          onChange={e => updateMeta('signatures_valid', e.target.checked)}
          labelTitle="SIGNATURES VALID"
          description="Uncheck to mark as Forged"
          accentColor="var(--accent-crimson)"
          bgColor="rgba(163, 50, 50, 0.1)"
        />
      </div>
    </>
  );
}