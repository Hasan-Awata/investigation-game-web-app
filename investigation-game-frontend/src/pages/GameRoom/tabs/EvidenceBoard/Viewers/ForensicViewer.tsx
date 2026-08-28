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

export default function ForensicViewer({ evidence }: ForensicViewerProps) {
  const { sub_type } = evidence;

  let content;
  switch (sub_type) {
    case 'autopsy':
      content = <AutopsyViewer evidence={evidence} />;
      break;
    case 'ballistics':
      content = <BallisticsViewer evidence={evidence} />;
      break;
    case 'dna':
      content = <DnaViewer evidence={evidence} />; 
      break;
    case 'digital_forensics':
      content = <DigitalForensicsViewer evidence={evidence} />;
      break;
    case 'trace_analysis':
      content = <TraceAnalysisViewer evidence={evidence} />;
      break;
    default:
      content = (
        <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Forensic report corrupted or unreadable.
        </div>
      );
  }

  return (
    <ViewersContainer evidence={evidence}>
      {content}
    </ViewersContainer>
  );
}