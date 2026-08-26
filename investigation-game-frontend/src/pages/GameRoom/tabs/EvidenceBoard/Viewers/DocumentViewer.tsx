import type { DocumentEvidence } from '@/types/evidence';
import FinancialRecordViewer from './DocumentViewers/FinancialRecordViewer';
import ContractViewer from './DocumentViewers/ContractViewer';
import JournalViewer from './DocumentViewers/JournalViewer';
import MemoViewer from './DocumentViewers/MemoViewer';
import CorrespondenceViewer from './DocumentViewers/CorrespondenceViewer';
import BackgroundCheckViewer from './DocumentViewers/BackgroundCheckViewer';

interface DocumentViewerProps {
  evidence: DocumentEvidence;
}

export default function DocumentViewer({ evidence }: DocumentViewerProps) {
  const { sub_type } = evidence;

  const renderDocumentContent = () => {
    switch (sub_type) {
      case 'correspondence':
        return <CorrespondenceViewer evidence={evidence} />;
      case 'financial':
        return <FinancialRecordViewer evidence={evidence} />;
      case 'journal':
        return <JournalViewer evidence={evidence} />;
      case 'contract':
        return <ContractViewer evidence={evidence} />;
      case 'memo':
        return <MemoViewer evidence={evidence} />;
      case 'background_check': 
        return <BackgroundCheckViewer evidence={evidence} />;
      default:
        return (
          <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Document contents illegible or corrupted.
          </div>
        );
    }
  };

  return (
    <div className="document-report-container">
      {renderDocumentContent()}
    </div>
  );
}