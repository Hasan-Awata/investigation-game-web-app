import type { Evidence } from '@/types/evidence';
import './TestimonyViewer.css';

interface TestimonyViewerProps {
  evidence: Evidence;
}

export default function TestimonyViewer({ evidence }: TestimonyViewerProps) {
  // Extract the transcript from the metadata object
  const transcript = evidence.metadata?.transcript || 'No transcript data available on record.';

  return (
    <div className="testimony-report-container">
      <div className="testimony-header-block">
        <h2 className="testimony-title">OFFICIAL INTERVIEW TRANSCRIPT</h2>
        <div className="testimony-meta-row">
          <span className="testimony-meta-label">RECORDING ID:</span>
          <span className="testimony-meta-value">EX-{evidence.id.toString().padStart(3, '0')}</span>
        </div>
        <div className="testimony-meta-row">
          <span className="testimony-meta-label">SUBJECT:</span>
          <span className="testimony-subject-value">{evidence.title}</span>
        </div>
      </div>
      <div className="testimony-body">
        {transcript}
      </div>
    </div>
  );
}