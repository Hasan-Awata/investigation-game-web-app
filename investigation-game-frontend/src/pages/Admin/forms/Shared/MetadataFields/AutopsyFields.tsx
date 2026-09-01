import { useDynamicList } from '@/hooks/useDynamicList';
import type { AutopsyMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import {
  AdminRow, AdminInput, AdminTextarea, 
  DynamicListHeader, RemoveButton
} from '@/pages/Admin/components/AdminUI';

export default function AutopsyFields({ metadata, updateMeta }: MetadataFieldProps<AutopsyMetadata>) {
  const { items, add, updatePrimitive, remove } = useDynamicList<string>(
    metadata.evidence_collected || [],
    (newList) => updateMeta('evidence_collected', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label="Victim Name" value={metadata.victim_name || ''} onChange={e => updateMeta('victim_name', e.target.value)} placeholder="e.g., John Doe" />
        <AdminInput label="Gender" value={metadata.gender || ''} onChange={e => updateMeta('gender', e.target.value)} placeholder="e.g., Male / Female" />
        <AdminInput label="Estimated Age" value={metadata.victim_age || ''} onChange={e => updateMeta('victim_age', e.target.value)} placeholder="e.g., 30-35" />
      </AdminRow>
      <AdminRow>
        <AdminInput label="Chief Medical Examiner" required value={metadata.examiner || ''} onChange={e => updateMeta('examiner', e.target.value)} />
        <AdminInput label="Est. Time of Death" required value={metadata.time_of_death || ''} onChange={e => updateMeta('time_of_death', e.target.value)} />
      </AdminRow>
      <AdminInput label="Primary Cause of Death" required value={metadata.cause_of_death || ''} onChange={e => updateMeta('cause_of_death', e.target.value)} />
      <AdminTextarea label="External Examination & Anomalies" value={metadata.anomalies || ''} onChange={e => updateMeta('anomalies', e.target.value)} />
      <AdminTextarea label="Internal Examination & Organs" value={metadata.internal_exam || ''} onChange={e => updateMeta('internal_exam', e.target.value)} placeholder="Findings from internal cavities and organs..." />
      <AdminTextarea label="Toxicology Report / Lab Analysis" minHeight="60px" value={metadata.toxicology_report || ''} onChange={e => updateMeta('toxicology_report', e.target.value)} placeholder="Blood alcohol, poisons, or chemical substances detected..." />

      <DynamicListHeader title="COLLECTED EVIDENCE / SAMPLES" onAdd={() => add('')} addLabel="+ Add Sample" />
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <AdminInput value={item} onChange={e => updatePrimitive(idx, e.target.value)} placeholder="e.g. 9mm bullet fragment extracted from chest" required />
          <RemoveButton onClick={() => remove(idx)} />
        </div>
      ))}
      {items.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>No evidence items logged. Add a row above.</div>}
    </>
  );
}