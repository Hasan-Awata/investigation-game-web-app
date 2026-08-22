import type { Evidence } from '@/types/evidence';
import './TestimonyViewer.css';

interface TestimonyViewerProps {
  evidence: Evidence;
}

export default function TestimonyViewer({ evidence }: TestimonyViewerProps) {
  const { metadata } = evidence;
  const transcript = metadata?.transcript || "No official transcript was filed for this testimony.";

  // Helper function to dynamically style Q&A formats (if the admin typed Q: or A:)
  const formatTranscript = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('Q:')) {
        return <div key={idx} className="transcript-q"><span className="speaker-tag">DETECTIVE:</span> {trimmedLine.substring(2)}</div>;
      } else if (trimmedLine.startsWith('A:')) {
        return <div key={idx} className="transcript-a"><span className="speaker-tag">WITNESS:</span> {trimmedLine.substring(2)}</div>;
      } else if (trimmedLine === '') {
        return <br key={idx} />; // Preserve empty lines for pacing
      }
      return <div key={idx} className="transcript-line">{line}</div>;
    });
  };

  return (
    <div className="testimony-modal-viewer">
      <div className="testimony-paper">
        <div className="testimony-header">
          <div className="testimony-agency">CITY POLICE DEPARTMENT</div>
          <h2 className="testimony-title">RECORD OF INTERVIEW // SWORN STATEMENT</h2>
          <div className="testimony-meta-grid">
            <div className="meta-box">
              <span className="meta-label">EXHIBIT NO.</span>
              <span className="meta-value">EX-{evidence.id.toString().padStart(3, '0')}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">DATE RECORDED</span>
              <span className="meta-value">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">STATUS</span>
              <span className="meta-value">TRANSCRIBED</span>
            </div>
          </div>
        </div>

        <div className="testimony-subject-block">
          <span className="subject-label">SUBJECT / INTERVIEWEE:</span>
          <span className="subject-value">{evidence.title}</span>
        </div>

        {evidence.description && (
          <div className="testimony-context">
            <strong>CONTEXT: </strong> {evidence.description}
          </div>
        )}

        <div className="transcript-container">
          <div className="transcript-watermark">CONFIDENTIAL</div>
          <div className="transcript-content">
            {formatTranscript(transcript)}
          </div>
        </div>

        <div className="testimony-footer">
          <div className="certification-statement">
            I hereby certify that the foregoing is a true and accurate transcript of the recorded interview.
          </div>
          <div className="signature-area">
            <div className="steno-signature">Transcribed by System</div>
            <div className="signature-line">COURT STENOGRAPHER</div>
          </div>
        </div>
      </div>
    </div>
  );
}