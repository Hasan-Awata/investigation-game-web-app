import { AdminSelect, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import {
  AutopsyFields, BallisticsFields, DNAFields, DigitalForensicsFields, TraceAnalysisFields,
  CorrespondenceFields, FinancialFields, JournalFields, ContractFields, MemoFields, BackgroundCheckFields
} from './MetadataFields';
import './AdminForms.css';

interface EvidenceMetadataFieldsProps {
  evidenceType: string;
  subType: string;
  setSubType: (val: string) => void;
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function EvidenceMetadataFields({ evidenceType, subType, setSubType, metadata, updateMeta }: EvidenceMetadataFieldsProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceMetadata || {
    sectionTitle: "[ Structured Metadata Injection ]",
    forensicAutopsy: "Autopsy Report",
    forensicBallistics: "Ballistics Analysis",
    forensicDna: "DNA / Serology Profile",
    forensicDigital: "Digital Forensics",
    forensicTrace: "Trace / Material Analysis",
    docCorrespondence: "Correspondence (Email/Letter)",
    docFinancial: "Financial Record",
    docJournal: "Personal Diary / Journal",
    docContract: "Official Contract / Deed",
    docMemo: "Corporate Memo / Note",
    docBackground: "Background Check / Dossier",
    selectForensicPlaceholder: "-- Select Forensic Classification --",
    selectDocPlaceholder: "-- Select Document Classification --",
    officialTranscriptLabel: "Official Transcript"
  };

  const FORENSIC_OPTIONS = [
    { value: "autopsy", label: t.forensicAutopsy },
    { value: "ballistics", label: t.forensicBallistics },
    { value: "dna", label: t.forensicDna },
    { value: "digital_forensics", label: t.forensicDigital },
    { value: "trace_analysis", label: t.forensicTrace }
  ];

  const DOCUMENT_OPTIONS = [
    { value: "correspondence", label: t.docCorrespondence },
    { value: "financial", label: t.docFinancial },
    { value: "journal", label: t.docJournal },
    { value: "contract", label: t.docContract },
    { value: "memo", label: t.docMemo },
    { value: "background_check", label: t.docBackground }
  ];

  const renderSubTypeSelector = () => {
    if (evidenceType === 'forensic') return <AdminSelect required value={subType} onChange={e => setSubType(e.target.value)} options={FORENSIC_OPTIONS} placeholder={t.selectForensicPlaceholder} />;
    if (evidenceType === 'document') return <AdminSelect required value={subType} onChange={e => setSubType(e.target.value)} options={DOCUMENT_OPTIONS} placeholder={t.selectDocPlaceholder} />;
    return null;
  };

  const renderDynamicInputs = () => {
    const props = { metadata, updateMeta: updateMeta as any };
    
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
          return <AdminTextarea label={t.officialTranscriptLabel} value={metadata.transcript || ''} onChange={e => updateMeta('transcript', e.target.value)} />;
        }
        return null;
    }
  };

  if (evidenceType === 'image' || evidenceType === 'audio') return null;

  return (
    <div className="metadata-container">
      <h4 className="metadata-title">
        {t.sectionTitle}
      </h4>
      {renderSubTypeSelector()}
      {(subType || evidenceType === 'testimony') && (
        <div className="metadata-inputs-wrapper">
          {renderDynamicInputs()}
        </div>
      )}
    </div>
  );
}