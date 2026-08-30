import { AdminRow, AdminInput, AdminTextarea, FormattingGuide } from '@/components/AdminUI';

interface BackgroundCheckFieldsProps {
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function BackgroundCheckFields({ metadata, updateMeta }: BackgroundCheckFieldsProps) {
  return (
    <>
      <FormattingGuide />
      <AdminRow>
        <AdminInput label="Subject Name" required value={metadata.subject_name || ''} onChange={e => updateMeta('subject_name', e.target.value)} />
        <AdminInput label="DOB (e.g., 10/24/1985)" required value={metadata.dob || ''} onChange={e => updateMeta('dob', e.target.value)} />
        <AdminInput label="Sex/Age (e.g., M / 41)" required value={metadata.sex_age || ''} onChange={e => updateMeta('sex_age', e.target.value)} />
      </AdminRow>
      <AdminRow>
        <AdminInput label="Aliases / Monikers" value={metadata.aliases || ''} onChange={e => updateMeta('aliases', e.target.value)} />
        <AdminInput label="Last Known Address" value={metadata.last_known_address || ''} onChange={e => updateMeta('last_known_address', e.target.value)} />
      </AdminRow>

      <AdminTextarea label="Employment & Financial Flags" value={metadata.employment_financial || ''} onChange={e => updateMeta('employment_financial', e.target.value)} />
      <AdminTextarea label="Criminal History (Docket Format)" minHeight="100px" value={metadata.criminal_history || ''} onChange={e => updateMeta('criminal_history', e.target.value)} />
      <AdminTextarea label="Known Associates" value={metadata.associates || ''} onChange={e => updateMeta('associates', e.target.value)} />

      <div className="form-group" style={{ marginTop: '1rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
        <label style={{ color: 'var(--accent-crimson)' }}>Investigator Handwritten Scrawls</label>
        <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder="Will render in a red cursive marker font across the bottom of the page..." style={{ minHeight: '80px' }} />
      </div>
    </>
  );
}