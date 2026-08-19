import type { ForensicEvidence } from '@/types/evidence';
import './ForensicViewer.css'; 

interface ForensicViewerProps {
  evidence: ForensicEvidence;
}

export default function ForensicViewer({ evidence }: ForensicViewerProps) {
  const { sub_type, metadata } = evidence;

  const renderForensicGrid = () => {
    switch (sub_type) {
      case 'autopsy':
        return (
          <>
            <div className="data-block">
              <span className="data-label">Chief Medical Examiner</span>
              <span className="data-value">{metadata.examiner}</span>
            </div>
            <div className="data-block">
              <span className="data-label">Estimated Time of Death</span>
              <span className="data-value">{metadata.time_of_death}</span>
            </div>
            <div className="data-block" style={{ gridColumn: '1 / -1' }}>
              <span className="data-label">Primary Cause of Death</span>
              <span className="data-value highlight">{metadata.cause_of_death}</span>
            </div>
            {metadata.anomalies && (
              <div className="forensic-notes" style={{ gridColumn: '1 / -1' }}>
                {metadata.anomalies}
              </div>
            )}
          </>
        );

      case 'ballistics':
        return (
          <>
            <div className="data-block">
              <span className="data-label">Weapon Classification</span>
              <span className="data-value">{metadata.weapon_type}</span>
            </div>
            <div className="data-block">
              <span className="data-label">Caliber</span>
              <span className="data-value">{metadata.caliber}</span>
            </div>
            <div className="data-block" style={{ gridColumn: '1 / -1' }}>
              <span className="data-label">Striation Match Status</span>
              <span className={`data-value ${metadata.striation_match ? 'highlight' : ''}`}>
                {metadata.striation_match ? 'POSITIVE MATCH CONFIRMED' : 'INCONCLUSIVE'}
              </span>
            </div>
          </>
        );

      case 'dna':
        return (
          <>
            <div className="data-block">
              <span className="data-label">Sample Type</span>
              <span className="data-value">{metadata.sample_type}</span>
            </div>
            <div className="data-block">
              <span className="data-label">Match Probability</span>
              <span className="data-value">{metadata.match_probability}</span>
            </div>
            <div className="data-block" style={{ gridColumn: '1 / -1' }}>
              <span className="data-label">Identified Subject</span>
              <span className={`data-value ${metadata.identified_person ? 'highlight' : ''}`}>
                {metadata.identified_person || 'NO MATCH FOUND IN DATABASE'}
              </span>
            </div>
          </>
        );

      case 'digital_forensics':
        return (
          <>
            <div className="data-block">
              <span className="data-label">Device Classification</span>
              <span className="data-value">{metadata.device_type}</span>
            </div>
            <div className="data-block">
              <span className="data-label">Extraction Method</span>
              <span className="data-value">{metadata.extraction_method}</span>
            </div>
            <div className="forensic-notes" style={{ gridColumn: '1 / -1' }}>
              <span className="data-label" style={{ color: 'var(--accent-crimson)' }}>[ RECOVERED DATA DECRYPTED ]</span>
              <span className="data-value" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{metadata.recovered_data}</span>
            </div>
          </>
        );

      case 'trace_analysis':
        return (
          <>
            <div className="data-block">
              <span className="data-label">Material Composition</span>
              <span className="data-value">{metadata.material_type}</span>
            </div>
            <div className="data-block" style={{ gridColumn: '1 / -1' }}>
              <span className="data-label">Identified Origin Source</span>
              <span className="data-value highlight">{metadata.origin_source}</span>
            </div>
          </>
        );

      default:
        return <div className="data-block">Awaiting specific analysis details.</div>;
    }
  };

  return (
    <div className="forensic-report-container">
      <header className="forensic-header">
        <div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>DEPARTMENT OF FORENSIC SCIENCES</span>
          <h3 className="forensic-title">{sub_type.replace('_', ' ')} REPORT</h3>
        </div>
        <div className="forensic-barcode">*{evidence.id}*</div>
      </header>
      
      <div className="forensic-data-grid">
        {renderForensicGrid()}
      </div>
    </div>
  );
}