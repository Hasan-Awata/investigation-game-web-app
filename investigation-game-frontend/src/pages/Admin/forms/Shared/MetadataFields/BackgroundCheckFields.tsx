import { AdminRow, AdminInput, AdminTextarea, FormattingGuide } from '@/pages/Admin/components/AdminUI';
import type { BackgroundCheckMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function BackgroundCheckFields({ metadata, updateMeta }: MetadataFieldProps<BackgroundCheckMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.backgroundCheck;

  return (
    <>
      <FormattingGuide />
      <AdminRow>
        <AdminInput label={t.subjectNameLabel} required value={metadata.subject_name || ''} onChange={e => updateMeta('subject_name', e.target.value)} />
        <AdminInput label={t.dobLabel} required value={metadata.dob || ''} onChange={e => updateMeta('dob', e.target.value)} />
        <AdminInput label={t.sexAgeLabel} required value={metadata.sex_age || ''} onChange={e => updateMeta('sex_age', e.target.value)} />
      </AdminRow>
      <AdminRow>
        <AdminInput label={t.aliasesLabel} value={metadata.aliases || ''} onChange={e => updateMeta('aliases', e.target.value)} />
        <AdminInput label={t.addressLabel} value={metadata.last_known_address || ''} onChange={e => updateMeta('last_known_address', e.target.value)} />
      </AdminRow>

      <AdminTextarea label={t.employmentLabel} value={metadata.employment_financial || ''} onChange={e => updateMeta('employment_financial', e.target.value)} />
      <AdminTextarea label={t.criminalHistoryLabel} minHeight="100px" value={metadata.criminal_history || ''} onChange={e => updateMeta('criminal_history', e.target.value)} />
      <AdminTextarea label={t.associatesLabel} value={metadata.associates || ''} onChange={e => updateMeta('associates', e.target.value)} />

      <div className="form-group" style={{ marginTop: '1rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
        <label style={{ color: 'var(--accent-crimson)' }}>{t.notesLabel}</label>
        <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder={t.notesPlaceholder} style={{ minHeight: '80px' }} />
      </div>
    </>
  );
}