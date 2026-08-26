import type { ForensicEvidence } from '@/types/evidence';
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

  switch (sub_type) {
    case 'autopsy':
      return <AutopsyViewer evidence={evidence} />;
    case 'ballistics':
      return <BallisticsViewer evidence={evidence} />;
    case 'dna':
      return <DnaViewer evidence={evidence} />; 
    case 'digital_forensics':
      return <DigitalForensicsViewer evidence={evidence} />;
    case 'trace_analysis':
      return <TraceAnalysisViewer evidence={evidence} />;
    default:
      return (
        <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Forensic report corrupted or unreadable.
        </div>
      );
  }
}