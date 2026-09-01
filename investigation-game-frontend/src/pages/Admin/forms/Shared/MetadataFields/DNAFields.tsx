import { AdminRow, AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { DnaMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

export default function DNAFields({ metadata, updateMeta }: MetadataFieldProps<DnaMetadata>) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata.dna;

  return (
    <>
      <AdminRow>
        <AdminInput label={t.sampleTypeLabel} required value={metadata.sample_type || ''} onChange={e => updateMeta('sample_type', e.target.value)} placeholder={t.sampleTypePlaceholder} />
        <AdminInput label={t.matchProbabilityLabel} required value={metadata.match_probability || ''} onChange={e => updateMeta('match_probability', e.target.value)} />
      </AdminRow>
      <AdminRow>
        <AdminInput label={t.technicianLabel} value={metadata.lab_technician || ''} onChange={e => updateMeta('lab_technician', e.target.value)} placeholder={t.technicianPlaceholder} />
        <AdminInput label={t.extractionMethodLabel} value={metadata.extraction_method || ''} onChange={e => updateMeta('extraction_method', e.target.value)} placeholder={t.extractionMethodPlaceholder} />
      </AdminRow>
      <AdminInput label={t.identifiedPersonLabel} value={metadata.identified_person || ''} onChange={e => updateMeta('identified_person', e.target.value)} />
      <AdminTextarea label={t.lociSummaryLabel} value={metadata.loci_profile_summary || ''} onChange={e => updateMeta('loci_profile_summary', e.target.value)} placeholder={t.lociSummaryPlaceholder} />
      <AdminTextarea label={t.labNotesLabel} minHeight="60px" value={metadata.lab_notes || ''} onChange={e => updateMeta('lab_notes', e.target.value)} placeholder={t.labNotesPlaceholder} />
    </>
  );
}