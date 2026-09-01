import { useDynamicList } from '@/hooks/useDynamicList';
import type { AutopsyMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import {
  AdminRow, AdminInput, AdminTextarea, 
  DynamicListHeader, RemoveButton
} from '@/pages/Admin/components/AdminUI';

export default function AutopsyFields({ metadata, updateMeta }: MetadataFieldProps<AutopsyMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.autopsy;

  const { items, add, updatePrimitive, remove } = useDynamicList<string>(
    metadata.evidence_collected || [],
    (newList) => updateMeta('evidence_collected', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label={t.victimNameLabel} value={metadata.victim_name || ''} onChange={e => updateMeta('victim_name', e.target.value)} placeholder={t.victimNamePlaceholder} />
        <AdminInput label={t.genderLabel} value={metadata.gender || ''} onChange={e => updateMeta('gender', e.target.value)} placeholder={t.genderPlaceholder} />
        <AdminInput label={t.ageLabel} value={metadata.victim_age || ''} onChange={e => updateMeta('victim_age', e.target.value)} placeholder={t.agePlaceholder} />
      </AdminRow>
      <AdminRow>
        <AdminInput label={t.examinerLabel} required value={metadata.examiner || ''} onChange={e => updateMeta('examiner', e.target.value)} />
        <AdminInput label={t.timeOfDeathLabel} required value={metadata.time_of_death || ''} onChange={e => updateMeta('time_of_death', e.target.value)} />
      </AdminRow>
      <AdminInput label={t.causeOfDeathLabel} required value={metadata.cause_of_death || ''} onChange={e => updateMeta('cause_of_death', e.target.value)} />
      <AdminTextarea label={t.anomaliesLabel} value={metadata.anomalies || ''} onChange={e => updateMeta('anomalies', e.target.value)} />
      <AdminTextarea label={t.internalExamLabel} value={metadata.internal_exam || ''} onChange={e => updateMeta('internal_exam', e.target.value)} placeholder={t.internalExamPlaceholder} />
      <AdminTextarea label={t.toxicologyLabel} minHeight="60px" value={metadata.toxicology_report || ''} onChange={e => updateMeta('toxicology_report', e.target.value)} placeholder={t.toxicologyPlaceholder} />

      <DynamicListHeader title={t.evidenceHeader} onAdd={() => add('')} addLabel={t.addSampleBtn} />
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <AdminInput value={item} onChange={e => updatePrimitive(idx, e.target.value)} placeholder={t.samplePlaceholder} required />
          <RemoveButton onClick={() => remove(idx)} />
        </div>
      ))}
      {items.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{t.emptyMessage}</div>}
    </>
  );
}