import { useDynamicList } from '@/hooks/useDynamicList';
import {
  AdminRow, AdminInput, AdminTextarea,
  FormattingGuide, DynamicListHeader, RemoveButton
} from '@/pages/Admin/components/AdminUI';
import type { BallisticsMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';

export default function BallisticsFields({ metadata, updateMeta }: MetadataFieldProps<BallisticsMetadata>) {
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
        <AdminInput label="Lab Case Number" required value={metadata.case_number || ''} onChange={e => updateMeta('case_number', e.target.value)} placeholder="e.g., 2026-BL-8842" />
      </AdminRow>

      <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>CHAIN OF CUSTODY</h5>
      <AdminRow>
        <AdminInput label="Submitted By" value={metadata.chain_of_custody?.submitted_by || ''} onChange={e => updateChainOfCustody('submitted_by', e.target.value)} placeholder="e.g., Det. Miller" />
        <AdminInput label="Received Date" value={metadata.chain_of_custody?.received_date || ''} onChange={e => updateChainOfCustody('received_date', e.target.value)} placeholder="e.g., 2026-06-12" />
      </AdminRow>

      <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>BALLISTIC PARAMETERS</h5>
      <AdminRow>
        <AdminInput label="Caliber & Manufacturer" value={metadata.caliber || ''} onChange={e => updateMeta('caliber', e.target.value)} placeholder="e.g., 9mm Luger (Winchester)" />
        <AdminInput label="Rifling Pattern" value={metadata.rifling_pattern || ''} onChange={e => updateMeta('rifling_pattern', e.target.value)} placeholder="e.g., 6 Lands & Grooves, Right Twist" />
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
      <AdminTextarea label="Estimated Firing Distance & Dynamics" minHeight="60px" value={metadata.firing_distance || ''} onChange={e => updateMeta('firing_distance', e.target.value)} placeholder="e.g., Contact to close range (0-30cm)..." />
      <AdminTextarea label="Official Conclusion / Match Determination" required style={{ borderLeft: '3px solid var(--accent-crimson)' }} minHeight="60px" value={metadata.conclusion || ''} onChange={e => updateMeta('conclusion', e.target.value)} placeholder="e.g., MATCH CONFIRMED: Striation patterns on Exhibit A match..." />

      <div className="form-group" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
        <label style={{ color: 'var(--accent-crimson)' }}>Investigator Handwritten Scrawls</label>
        <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder="Will render in a red cursive marker font..." style={{ minHeight: '80px' }} />
      </div>
    </>
  );
}