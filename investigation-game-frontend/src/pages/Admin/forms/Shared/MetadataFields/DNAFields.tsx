import { AdminRow, AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { DnaMetadata } from '@/types/evidence';
import type { MetadataFieldProps } from './types';

export default function DNAFields({ metadata, updateMeta }: MetadataFieldProps<DnaMetadata>) {
  return (
    <>
      <AdminRow>
        <AdminInput label="Sample Type (e.g., Blood, Hair)" required value={metadata.sample_type || ''} onChange={e => updateMeta('sample_type', e.target.value)} />
        <AdminInput label="Match Probability" required value={metadata.match_probability || ''} onChange={e => updateMeta('match_probability', e.target.value)} />
      </AdminRow>
      <AdminRow>
        <AdminInput label="Lab Technician" value={metadata.lab_technician || ''} onChange={e => updateMeta('lab_technician', e.target.value)} placeholder="e.g., Dr. Jane Doe" />
        <AdminInput label="Extraction Method" value={metadata.extraction_method || ''} onChange={e => updateMeta('extraction_method', e.target.value)} placeholder="e.g., FTA Card / Phenol-Chloroform" />
      </AdminRow>
      <AdminInput label="Identified Subject (Leave blank if inconclusive)" value={metadata.identified_person || ''} onChange={e => updateMeta('identified_person', e.target.value)} />
      <AdminTextarea label="STR Loci Profile Summary" value={metadata.loci_profile_summary || ''} onChange={e => updateMeta('loci_profile_summary', e.target.value)} placeholder="Details on allele frequencies and genetic markers..." />
      <AdminTextarea label="Laboratory Notes & Observations" minHeight="60px" value={metadata.lab_notes || ''} onChange={e => updateMeta('lab_notes', e.target.value)} placeholder="Additional analytical insights or chain of custody notes..." />
    </>
  );
}