import { AdminTextarea } from '@/pages/Admin/components/AdminUI';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import adminForms from './AdminForms.module.css';

interface EvidenceMetadataFieldsProps {
  evidenceType: string;
  metadata: Record<string, unknown>;
  updateMeta: (key: string, value: unknown) => void;
}

/**
 * Metadata panel for the non-document evidence types.
 *
 * `document` and `forensic` no longer route through here at all -- EvidenceForm
 * mounts the DocBuilder for those, because the block model is a layout surface,
 * not a form. What remains is testimony's flat transcript field.
 */
export default function EvidenceMetadataFields({ evidenceType, metadata, updateMeta }: EvidenceMetadataFieldsProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata;

  if (evidenceType === 'image' || evidenceType === 'audio') return null;

  return (
    <div className={adminForms['metadata-container']}>
      <h4 className={adminForms['metadata-title']}>{t.sectionTitle}</h4>
      {evidenceType === 'testimony' && (
        <div className={adminForms['metadata-inputs-wrapper']}>
          <AdminTextarea
            label={t.officialTranscriptLabel}
            minHeight="140px"
            value={String(metadata.transcript ?? '')}
            onChange={(e) => updateMeta('transcript', e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
