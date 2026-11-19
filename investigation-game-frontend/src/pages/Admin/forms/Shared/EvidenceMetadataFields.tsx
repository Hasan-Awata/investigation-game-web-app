import { AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import adminForms from './AdminForms.module.css';

interface EvidenceMetadataFieldsProps {
  metadata: Record<string, unknown>;
  updateMeta: (key: string, value: unknown) => void;
}

export default function EvidenceMetadataFields({ metadata, updateMeta }: EvidenceMetadataFieldsProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata;

  return (
    <div className={adminForms['metadata-container']}>
      <h4 className={adminForms['metadata-title']}>{t.sectionTitle}</h4>
      <div className={adminForms['metadata-inputs-wrapper']}>
        <AdminInput label={t.agencyLabel} value={String(metadata.agency ?? '')} onChange={(e) => updateMeta('agency', e.target.value)} />
        <AdminInput label={t.titleLabel} value={String(metadata.title ?? '')} onChange={(e) => updateMeta('title', e.target.value)} />
        <AdminInput label={t.subjectLabel} value={String(metadata.subject ?? metadata.subject_name ?? '')} onChange={(e) => updateMeta('subject', e.target.value)} />
        <AdminInput label={t.interviewerLabel} value={String(metadata.interviewer ?? '')} onChange={(e) => updateMeta('interviewer', e.target.value)} />
        <AdminInput label={t.dateLabel} value={String(metadata.date ?? '')} onChange={(e) => updateMeta('date', e.target.value)} />
        <AdminTextarea
          label={t.officialTranscriptLabel}
          minHeight="140px"
          value={String(metadata.transcript ?? '')}
          onChange={(e) => updateMeta('transcript', e.target.value)}
        />
      </div>
    </div>
  );
}
