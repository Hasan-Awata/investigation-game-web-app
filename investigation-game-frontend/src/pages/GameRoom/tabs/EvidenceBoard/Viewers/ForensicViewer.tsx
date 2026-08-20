import type { ForensicEvidence } from '@/types/evidence';
import './ForensicViewer.css'; 

interface ForensicViewerProps {
  evidence: ForensicEvidence;
}

export default function ForensicViewer({ evidence }: ForensicViewerProps) {
  const { sub_type, metadata } = evidence;

  switch (sub_type) {
    case 'ballistics':
      return (
        <div className="ballistics-paper">
          <div className="ballistics-header">
            <div>
              <div className="ballistics-agency">STATE FORENSIC LABORATORY</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>DIVISION OF BALLISTICS & TOOLMARKS</div>
              <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>CASE #{metadata.case_number}</div>
              <div className="ballistics-lab-stamp">OFFICIAL LABORATORY REPORT</div>
            </div>
            <div className="ballistics-barcode">*{metadata.case_number}*</div>
          </div>

          <div className="ballistics-specimen-box">
            <div className="ballistics-specimen-title">EVIDENCE INTAKE LOG</div>
            {(metadata.exhibits || []).map((ex: any, idx: number) => (
              <div key={idx} className="ballistics-specimen-row">
                <span className="ballistics-specimen-label">{ex.reference}:</span>
                <span dangerouslySetInnerHTML={{ __html: ex.description }} />
              </div>
            ))}
            {(!metadata.exhibits || metadata.exhibits.length === 0) && (
              <div style={{ fontStyle: 'italic' }}>No exhibits recorded on intake.</div>
            )}
          </div>

          <div className="ballistics-section-title">1. Firearm Specification Data</div>
          <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: metadata.firearm_specs }} />

          <div className="ballistics-section-title">2. Microscopic & Toolmark Analysis</div>
          <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: metadata.microscopic_analysis }} />
          
          {evidence.img_url && (
            <div className="microscope-comparison">
              <img src={evidence.img_url} alt="Microscopic Striations" className="microscope-image" />
              <div className="microscope-crosshair"></div>
              <div className="microscope-overlay-text">STRIATION ALIGNMENT LENS</div>
            </div>
          )}

          {metadata.trajectory_range && (
            <>
              <div className="ballistics-section-title">3. Trajectory & Range Findings</div>
              <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: metadata.trajectory_range }} />
            </>
          )}

          <div className="ballistics-conclusion" dangerouslySetInnerHTML={{ __html: metadata.conclusion }} />

          <div className="ballistics-sign-off">
            <div className="ballistics-sign-content">
              <div className="signature-ink">{metadata.examiner_name}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>SENIOR BALLISTICS EXPERT</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>VERIFIED LAB ID: {metadata.case_number}</div>
            </div>
          </div>

          {metadata.investigator_notes && (
            <div className="handwritten-note">
              {metadata.investigator_notes}
            </div>
          )}
        </div>
      );

    // =========================================================================
    // DEFAULT DARK TERMINAL THEME (For Autopsy, DNA, Digital, Trace)
    // =========================================================================
    case 'autopsy':
    case 'dna':
    case 'digital_forensics':
    case 'trace_analysis':
    default:
      return (
        <div className="forensic-report-container">
          <header className="forensic-header">
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>DEPARTMENT OF FORENSIC SCIENCES</span>
              <h3 className="forensic-title">{(sub_type || 'forensic').replace('_', ' ')} REPORT</h3>
            </div>
            <div className="forensic-barcode">*{evidence.id}*</div>
          </header>
          
          <div className="forensic-data-grid">
            {sub_type === 'autopsy' && (
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
            )}

            {sub_type === 'dna' && (
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
            )}

            {sub_type === 'digital_forensics' && (
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
            )}

            {sub_type === 'trace_analysis' && (
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
            )}
          </div>
        </div>
      );
  }
}