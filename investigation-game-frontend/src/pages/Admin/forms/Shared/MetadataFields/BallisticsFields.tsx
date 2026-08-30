import { useDynamicList } from '@/hooks/useDynamicList';
import {
  AdminRow, AdminInput, AdminTextarea,
  FormattingGuide, DynamicListHeader, RemoveButton
} from '@/components/AdminUI';

interface BallisticsFieldsProps {
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function BallisticsFields({ metadata, updateMeta }: BallisticsFieldsProps) {
  const { items, add, update, remove } = useDynamicList<{reference: string, description: string}>(
    metadata.exhibits || [],
    (newList) => updateMeta('exhibits', newList)
  );

  return (
    <>
      <FormattingGuide />
      <AdminRow>
        <AdminInput label="Lab Case Number" required value={metadata.case_number || ''} onChange={e => updateMeta('case_number', e.target.value)} placeholder="e.g., 2026-BL-8842" />
        <AdminInput label="Examiner Name" required value={metadata.examiner_name || ''} onChange={e => updateMeta('examiner_name', e.target.value)} />
      </AdminRow>

      <DynamicListHeader title="EVIDENCE INTAKE LOG (EXHIBITS)" onAdd={() => add({ reference: '', description: '' })} addLabel="+ Add Exhibit" />
      {items.map((ex, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <div style={{ width: '160px' }}>
            <AdminInput value={ex.reference} onChange={e => update(idx, 'reference', e.target.value)} placeholder="Ref (e.g. EXHIBIT A)" required />
          </div>
          <div style={{ flex: 1 }}>
            <AdminInput value={ex.description} onChange={e => update(idx, 'description', e.target.value)} placeholder="Description (e.g. Recovered 9mm Slug)" required />
          </div>
          <RemoveButton onClick={() => remove(idx)} />
        </div>
      ))}
      {items.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>No exhibits logged. Add a row above.</div>}

      <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>TECHNICAL FINDINGS</h5>
      <AdminTextarea label="Firearm Specification Data" minHeight="60px" value={metadata.firearm_specs || ''} onChange={e => updateMeta('firearm_specs', e.target.value)} />
      <AdminTextarea label="Microscopic & Toolmark Analysis" value={metadata.microscopic_analysis || ''} onChange={e => updateMeta('microscopic_analysis', e.target.value)} />
      <AdminTextarea label="Trajectory & Range Findings (If Applicable)" minHeight="60px" value={metadata.trajectory_range || ''} onChange={e => updateMeta('trajectory_range', e.target.value)} />
      <AdminTextarea label="Official Conclusion / Match Determination" required style={{ borderLeft: '3px solid var(--accent-crimson)' }} minHeight="60px" value={metadata.conclusion || ''} onChange={e => updateMeta('conclusion', e.target.value)} placeholder="e.g., MATCH CONFIRMED: Striation patterns on Exhibit A match..." />

      <div className="form-group" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
        <label style={{ color: 'var(--accent-crimson)' }}>Investigator Handwritten Scrawls</label>
        <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder="Will render in a red cursive marker font..." style={{ minHeight: '80px' }} />
      </div>
    </>
  );
}