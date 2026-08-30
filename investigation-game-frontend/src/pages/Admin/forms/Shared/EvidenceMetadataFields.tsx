import { AdminSelect, AdminTextarea } from '@/components/AdminUI';
import {
  AutopsyFields, BallisticsFields, DNAFields, DigitalForensicsFields, TraceAnalysisFields,
  CorrespondenceFields, FinancialFields, JournalFields, ContractFields, MemoFields, BackgroundCheckFields
} from './MetadataFields';

interface EvidenceMetadataFieldsProps {
  evidenceType: string;
  subType: string;
  setSubType: (val: string) => void;
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function EvidenceMetadataFields({ evidenceType, subType, setSubType, metadata, updateMeta }: EvidenceMetadataFieldsProps) {

  const FORENSIC_OPTIONS = [
    { value: "autopsy", label: "Autopsy Report" },
    { value: "ballistics", label: "Ballistics Analysis" },
    { value: "dna", label: "DNA / Serology Profile" },
    { value: "digital_forensics", label: "Digital Forensics" },
    { value: "trace_analysis", label: "Trace / Material Analysis" }
  ];

  const DOCUMENT_OPTIONS = [
    { value: "correspondence", label: "Correspondence (Email/Letter)" },
    { value: "financial", label: "Financial Record" },
    { value: "journal", label: "Personal Diary / Journal" },
    { value: "contract", label: "Official Contract / Deed" },
    { value: "memo", label: "Corporate Memo / Note" },
    { value: "background_check", label: "Background Check / Dossier" }
  ];

  const renderSubTypeSelector = () => {
    if (evidenceType === 'forensic') return <AdminSelect required value={subType} onChange={e => setSubType(e.target.value)} options={FORENSIC_OPTIONS} placeholder="-- Select Forensic Classification --" />;
    if (evidenceType === 'document') return <AdminSelect required value={subType} onChange={e => setSubType(e.target.value)} options={DOCUMENT_OPTIONS} placeholder="-- Select Document Classification --" />;
    return null;
  };

  const renderDynamicInputs = () => {
    const props = { metadata, updateMeta };
    
    switch (subType) {
      // FORENSICS
      case 'autopsy': return <AutopsyFields {...props} />;
      case 'ballistics': return <BallisticsFields {...props} />;
      case 'dna': return <DNAFields {...props} />;
      case 'digital_forensics': return <DigitalForensicsFields {...props} />;
      case 'trace_analysis': return <TraceAnalysisFields {...props} />;

      // DOCUMENTS
      case 'correspondence': return <CorrespondenceFields {...props} />;
      case 'financial': return <FinancialFields {...props} />;
      case 'journal': return <JournalFields {...props} />;
      case 'contract': return <ContractFields {...props} />;
      case 'memo': return <MemoFields {...props} />;
      case 'background_check': return <BackgroundCheckFields {...props} />;

      // FALLBACK
      default:
        if (evidenceType === 'testimony') {
          return <AdminTextarea label="Official Transcript" value={metadata.transcript || ''} onChange={e => updateMeta('transcript', e.target.value)} />;
        }
        return null;
    }
  };

  if (evidenceType === 'image' || evidenceType === 'audio') return null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '1.5rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
        [ Structured Metadata Injection ]
      </h4>
      {renderSubTypeSelector()}
      {(subType || evidenceType === 'testimony') && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {renderDynamicInputs()}
        </div>
      )}
    </div>
  );
}