import React from 'react';
import type { ForensicEvidence } from '@/types/evidence';
import ViewersContainer from './ViewersContainer';
import AutopsyViewer from './ForensicViewers/AutopsyViewer';
import BallisticsViewer from './ForensicViewers/BallisticsViewer';
import DnaViewer from './ForensicViewers/DnaViewer';
import DigitalForensicsViewer from './ForensicViewers/DigitalForensicsViewer';
import TraceAnalysisViewer from './ForensicViewers/TraceAnalysisViewer';

interface ForensicViewerProps {
  evidence: ForensicEvidence;
}

type ForensicRegistryMap = {
  [K in ForensicEvidence['sub_type']]: React.FC<{
    evidence: Extract<ForensicEvidence, { sub_type: K }>;
  }>;
};

const ForensicViewerRegistry: ForensicRegistryMap = {
  autopsy: AutopsyViewer,
  ballistics: BallisticsViewer,
  dna: DnaViewer,
  digital_forensics: DigitalForensicsViewer,
  trace_analysis: TraceAnalysisViewer,
};

export default function ForensicViewer({ evidence }: ForensicViewerProps) {
  const ViewerComponent = ForensicViewerRegistry[evidence.sub_type] as React.FC<{ evidence: ForensicEvidence }> | undefined;

  return (
    <ViewersContainer evidence={evidence}>
      {ViewerComponent ? (
        <ViewerComponent evidence={evidence} />
      ) : (
        <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Forensic report corrupted or unreadable.
        </div>
      )}
    </ViewersContainer>
  );
}