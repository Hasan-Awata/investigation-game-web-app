import { useDynamicList } from '@/hooks/useDynamicList';
import { AdminRow, AdminInput, DynamicListHeader, RemoveButton } from '@/pages/Admin/components/AdminUI';
import type { FinancialMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

const FinancialStatementPage = ({ page, pageIdx, updatePage, removePage }: { page: any, pageIdx: number, updatePage: any, removePage: any }) => {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.financial;

  const { items: txs, add, update, remove } = useDynamicList<{date: string, description: string, amount: number}>(
    page.transactions || [],
    (newTxs) => updatePage(pageIdx, 'transactions', newTxs)
  );

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent-amber)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <AdminInput label={t.statementPeriodLabel} required value={page.statement_period || ''} onChange={e => updatePage(pageIdx, 'statement_period', e.target.value)} placeholder={t.statementPeriodPlaceholder} />
        </div>
        <button type="button" onClick={() => removePage(pageIdx, 'page_number')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {t.removePageBtn(page.page_number)}
        </button>
      </div>
      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: 'var(--font-mono)' }}>{t.transactionsHeader}</span>
          <button type="button" onClick={() => add({ date: '', description: '', amount: 0 })} style={{ background: 'transparent', border: '1px solid #aaa', color: '#aaa', padding: '2px 8px', borderRadius: '2px', cursor: 'pointer', fontSize: '0.7rem' }}>
            {t.addRowBtn}
          </button>
        </div>
        {txs.map((tx: any, txIdx: number) => (
          <div key={txIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '100px' }}><AdminInput value={tx.date} onChange={e => update(txIdx, 'date', e.target.value)} placeholder={t.datePlaceholder} required /></div>
            <div style={{ flex: 1 }}><AdminInput value={tx.description} onChange={e => update(txIdx, 'description', e.target.value)} placeholder={t.descPlaceholder} required /></div>
            <div style={{ width: '120px' }}><AdminInput type="number" step="0.01" value={tx.amount} onChange={e => update(txIdx, 'amount', parseFloat(e.target.value))} placeholder={t.amountPlaceholder} required /></div>
            <RemoveButton onClick={() => remove(txIdx)} />
          </div>
        ))}
        {txs.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>{t.emptyTransactionsMsg}</div>}
      </div>
    </div>
  );
};

export default function FinancialFields({ metadata, updateMeta }: MetadataFieldProps<FinancialMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.financial;

  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<{page_number: number, statement_period: string, transactions: any[]}>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label={t.institutionLabel} required value={metadata.institution_name || ''} onChange={e => updateMeta('institution_name', e.target.value)} />
        <AdminInput label={t.holderLabel} required value={metadata.account_holder || ''} onChange={e => updateMeta('account_holder', e.target.value)} />
        <AdminInput label={t.accountNumberLabel} required value={metadata.account_number || ''} onChange={e => updateMeta('account_number', e.target.value)} />
      </AdminRow>

      <DynamicListHeader title={t.pagesHeader} onAdd={() => addPage({ page_number: pages.length + 1, statement_period: '', transactions: [] })} addLabel={t.addPageBtn} />
      
      {pages.map((page: any, pageIdx: number) => (
        <FinancialStatementPage key={pageIdx} page={page} pageIdx={pageIdx} updatePage={updatePage} removePage={removePage} />
      ))}
    </>
  );
}