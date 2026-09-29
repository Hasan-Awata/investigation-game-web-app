import { AdminTextarea } from '@/pages/Admin/components/AdminUI';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import './AdminForms.css';

interface EvidenceMetadataFieldsProps {
  evidenceType: string;
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
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
    <div className="metadata-container">
      <h4 className="metadata-title">{t?.sectionTitle ?? '[ Structured Metadata Injection ]'}</h4>
      {evidenceType === 'testimony' && (
        <div className="metadata-inputs-wrapper">
          <AdminTextarea
            label={t?.officialTranscriptLabel ?? 'Official Transcript'}
            minHeight="140px"
            value={metadata.transcript || ''}
            onChange={(e) => updateMeta('transcript', e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
