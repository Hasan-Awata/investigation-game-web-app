import React from 'react';
import type { DocumentEvidence } from '@/types/evidence';
import ViewersContainer from './ViewersContainer';
import FinancialRecordViewer from './DocumentViewers/FinancialRecordViewer';
import ContractViewer from './DocumentViewers/ContractViewer';
import JournalViewer from './DocumentViewers/JournalViewer';
import MemoViewer from './DocumentViewers/MemoViewer';
import CorrespondenceViewer from './DocumentViewers/CorrespondenceViewer';
import BackgroundCheckViewer from './DocumentViewers/BackgroundCheckViewer';

interface DocumentViewerProps {
  evidence: DocumentEvidence;
}

type DocumentRegistryMap = {
  [K in DocumentEvidence['sub_type']]: React.FC<{
    evidence: Extract<DocumentEvidence, { sub_type: K }>;
  }>;
};

const DocumentViewerRegistry: DocumentRegistryMap = {
  correspondence: CorrespondenceViewer,
  financial: FinancialRecordViewer,
  journal: JournalViewer,
  contract: ContractViewer,
  memo: MemoViewer,
  background_check: BackgroundCheckViewer,
};

export default function DocumentViewer({ evidence }: DocumentViewerProps) {
  const ViewerComponent = DocumentViewerRegistry[evidence.sub_type] as React.FC<{ evidence: DocumentEvidence }> | undefined;

  return (
    <ViewersContainer evidence={evidence}>
      {ViewerComponent ? (
        <ViewerComponent evidence={evidence} />
      ) : (
        <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Document contents illegible or corrupted.
        </div>
      )}
    </ViewersContainer>
  );
}