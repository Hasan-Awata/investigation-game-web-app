import { useDynamicList } from '@/hooks/useDynamicList';
import {
  AdminRow, AdminInput, AdminTextarea,
  FormattingGuide, DynamicListHeader, RemoveButton
} from '@/pages/Admin/components/AdminUI';
import type { BallisticsMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function BallisticsFields({ metadata, updateMeta }: MetadataFieldProps<BallisticsMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.ballistics;

  const { items, add, update, remove } = useDynamicList<{reference: string, description: string}>(
    metadata.exhibits || [],
    (newList) => updateMeta('exhibits', newList)
  );

  const updateChainOfCustody = (field: string, value: string) => {
    const current = metadata.chain_of_custody || { submitted_by: '', received_date: '' };
    updateMeta('chain_of_custody', { ...current, [field]: value });
  };

  return (
    <>
      <FormattingGuide />
      <AdminRow>
        <AdminInput label={t.caseNumberLabel} required value={metadata.case_number || ''} onChange={e => updateMeta('case_number', e.target.value)} placeholder={t.caseNumberPlaceholder} />
      </AdminRow>

      <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>{t.chainOfCustodyHeader}</h5>
      <AdminRow>
        <AdminInput label={t.submittedByLabel} value={metadata.chain_of_custody?.submitted_by || ''} onChange={e => updateChainOfCustody('submitted_by', e.target.value)} placeholder={t.submittedByPlaceholder} />
        <AdminInput label={t.receivedDateLabel} value={metadata.chain_of_custody?.received_date || ''} onChange={e => updateChainOfCustody('received_date', e.target.value)} placeholder={t.receivedDatePlaceholder} />
      </AdminRow>

      <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>{t.ballisticParamsHeader}</h5>
      <AdminRow>
        <AdminInput label={t.caliberLabel} value={metadata.caliber || ''} onChange={e => updateMeta('caliber', e.target.value)} placeholder={t.caliberPlaceholder} />
        <AdminInput label={t.riflingLabel} value={metadata.rifling_pattern || ''} onChange={e => updateMeta('rifling_pattern', e.target.value)} placeholder={t.riflingPlaceholder} />
      </AdminRow>

      <DynamicListHeader title={t.exhibitsHeader} onAdd={() => add({ reference: '', description: '' })} addLabel={t.addExhibitBtn} />
      {items.map((ex, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <div style={{ width: '160px' }}>
            <AdminInput value={ex.reference} onChange={e => update(idx, 'reference', e.target.value)} placeholder={t.refPlaceholder} required />
          </div>
          <div style={{ flex: 1 }}>
            <AdminInput value={ex.description} onChange={e => update(idx, 'description', e.target.value)} placeholder={t.descPlaceholder} required />
          </div>
          <RemoveButton onClick={() => remove(idx)} />
        </div>
      ))}
      {items.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{t.emptyExhibitsMsg}</div>}

      <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>{t.technicalFindingsHeader}</h5>
      <AdminTextarea label={t.firearmSpecsLabel} minHeight="60px" value={metadata.firearm_specs || ''} onChange={e => updateMeta('firearm_specs', e.target.value)} />
      <AdminTextarea label={t.microscopicLabel} value={metadata.microscopic_analysis || ''} onChange={e => updateMeta('microscopic_analysis', e.target.value)} />
      <AdminTextarea label={t.trajectoryLabel} minHeight="60px" value={metadata.trajectory_range || ''} onChange={e => updateMeta('trajectory_range', e.target.value)} />
      <AdminTextarea label={t.firingDistanceLabel} minHeight="60px" value={metadata.firing_distance || ''} onChange={e => updateMeta('firing_distance', e.target.value)} placeholder={t.firingDistancePlaceholder} />
      <AdminTextarea label={t.conclusionLabel} required style={{ borderLeft: '3px solid var(--accent-crimson)' }} minHeight="60px" value={metadata.conclusion || ''} onChange={e => updateMeta('conclusion', e.target.value)} placeholder={t.conclusionPlaceholder} />

      <div className="form-group" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
        <label style={{ color: 'var(--accent-crimson)' }}>{t.notesLabel}</label>
        <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder={t.notesPlaceholder} style={{ minHeight: '80px' }} />
      </div>
    </>
  );
}