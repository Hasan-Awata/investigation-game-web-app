import type { ForensicEvidence } from '@/types/evidence';
import './ForensicViewer.css'; 

interface ForensicViewerProps {
  evidence: ForensicEvidence;
}

export default function ForensicViewer({ evidence }: ForensicViewerProps) {
  const { sub_type, metadata } = evidence;

  switch (sub_type) {
    case 'autopsy':
      return (
        <div className="forensic-preview autopsy-paper">
          <div className="autopsy-header">
            <div className="autopsy-agency-block">
              <div className="autopsy-agency">OFFICE OF THE CHIEF MEDICAL EXAMINER</div>
              <h2 className="autopsy-title">REPORT OF AUTOPSY</h2>
              <div className="autopsy-sub-meta">CITY & COUNTY MORGUE DIVISION</div>
            </div>
            <div className="autopsy-meta-box">
              <div><span className="autopsy-label">CASE NO:</span> {evidence.id.toString().padStart(5, '0')}</div>
              <div><span className="autopsy-label">DATE:</span> {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="autopsy-body-section">
            <div className="autopsy-data-col">
              <div className="autopsy-data-row">
                <span className="autopsy-label">EXAMINER:</span>
                <span className="autopsy-value">{metadata.examiner}</span>
              </div>
              <div className="autopsy-data-row">
                <span className="autopsy-label">EST. TIME OF DEATH:</span>
                <span className="autopsy-value">{metadata.time_of_death}</span>
              </div>
              <div className="autopsy-data-row critical-row">
                <span className="autopsy-label">CAUSE OF DEATH:</span>
                <span className="autopsy-value cause-of-death">{metadata.cause_of_death}</span>
              </div>
              
              <div className="autopsy-notes-section">
                <span className="autopsy-label">EXTERNAL EXAMINATION & ANOMALIES:</span>
                <div className="autopsy-notes-content">
                  {metadata.anomalies || "The body is that of a normally developed individual. No visible anomalies or secondary trauma reported during standard examination."}
                </div>
              </div>
            </div>

            <div className="autopsy-diagram-col">
              <svg viewBox="0 0 100 220" className="autopsy-body-wireframe">
                {/* Head */}
                <circle cx="50" cy="25" r="14" />
                {/* Torso */}
                <path d="M35 50 Q50 45 65 50 L60 110 L40 110 Z" />
                {/* Arms */}
                <path d="M30 55 Q20 80 15 110" />
                <path d="M70 55 Q80 80 85 110" />
                {/* Legs */}
                <path d="M42 115 L40 195" />
                <path d="M58 115 L60 195" />
                {/* Grid Overlay */}
                <line x1="0" y1="50" x2="100" y2="50" className="grid-line" />
                <line x1="0" y1="110" x2="100" y2="110" className="grid-line" />
                <line x1="50" y1="0" x2="50" y2="220" className="grid-line" />
              </svg>
              <div className="diagram-caption">FIG 1. ANATOMICAL REFERENCE</div>
            </div>
          </div>
          
          <div className="autopsy-footer">
            <div className="autopsy-stamp">CONFIDENTIAL // OFFICIAL RECORD</div>
            <div className="autopsy-signature-block">
              <div className="autopsy-signature">{metadata.examiner}</div>
              <div className="autopsy-signature-line">CHIEF MEDICAL EXAMINER</div>
            </div>
          </div>
        </div>
      );

      case 'dna': {
      // Deterministically generate a visual sequence based on the evidence ID
      const generateSequence = (seed: number, isMatch: boolean) => {
        return [...Array(24)].map((_, i) => {
          const opacity = ((seed * (i + 1) * 17) % 100) / 100;
          // If it's a match, we perfectly mirror the original opacity. 
          // If not, we scramble it with a different seed multiplier to create a mismatch.
          const finalOpacity = isMatch ? opacity : ((seed * (i + 1) * 23) % 100) / 100;
          return (
            <div 
              key={i} 
              className={`dna-band ${finalOpacity > 0.5 ? 'dense' : ''}`} 
              style={{ opacity: finalOpacity }}
            />
          );
        });
      };

      const hasMatch = !!metadata.identified_person;

      return (
        <div className="forensic-preview dna-paper">
          <div className="dna-header">
            <div className="dna-lab-title">GENETIC FORENSICS LABORATORY</div>
            <div className="dna-report-type">STR DNA ANALYSIS & PROFILE MATCH</div>
          </div>

          <div className="dna-meta-row">
            <div className="dna-meta-item">
              <span className="dna-label">EVIDENCE ID:</span> 
              <span className="dna-meta-value">EX-{evidence.id.toString().padStart(3, '0')}</span>
            </div>
            <div className="dna-meta-item">
              <span className="dna-label">SAMPLE TYPE:</span> 
              <span className="dna-meta-value">{metadata.sample_type}</span>
            </div>
            <div className="dna-meta-item">
              <span className="dna-label">DATE:</span> 
              <span className="dna-meta-value">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="dna-visualizer-container">
            <h4 className="dna-visualizer-title">ELECTROPHEROGRAM COMPARISON</h4>
            <div className="dna-visualizer">
              <div className="dna-sequence-track">
                <div className="dna-track-label">CRIME SCENE SAMPLE</div>
                <div className="dna-bands-container">
                  {generateSequence(evidence.id, true)}
                </div>
              </div>
              <div className="dna-sequence-track match-track">
                <div className="dna-track-label">DATABASE RECORD</div>
                <div className="dna-bands-container">
                  {generateSequence(evidence.id, hasMatch)}
                </div>
              </div>
            </div>
          </div>

          <div className="dna-results-box">
            <div className="dna-result-row">
              <span className="dna-label">PROBABILITY OF MATCH:</span>
              <span className="dna-value highlight">{metadata.match_probability}</span>
            </div>
            <div className="dna-result-row">
              <span className="dna-label">IDENTIFIED SUBJECT:</span>
              <span className={`dna-value ${hasMatch ? 'subject-match' : 'subject-unknown'}`}>
                {metadata.identified_person || 'NO MATCH FOUND IN DATABASE'}
              </span>
            </div>
          </div>

          <div className="dna-footer">
            <div className="dna-barcode">|||||| |||| |||||||| |||||</div>
            <div className="dna-codis-stamp">CODIS SEARCH COMPLETED // VERIFIED</div>
          </div>
        </div>
      );
    }

    case 'digital_forensics':
      return (
        <div className="forensic-preview digital-terminal">
          <div className="terminal-header">
            <span className="terminal-dot red"></span>
            <span className="terminal-dot yellow"></span>
            <span className="terminal-dot green"></span>
            <span className="terminal-title">CYBER_CRIMES_UNIT_v3.4.1 // DECRYPTION_TERMINAL</span>
          </div>

          <div className="terminal-body">
            <div className="terminal-line command">
              <span className="prompt">root@ccu-server:~$</span> ./extract_payload.sh --target=EX-{evidence.id.toString().padStart(3, '0')}
            </div>
            
            <div className="terminal-line system">
              [+] Initiating forensic extraction protocol...
            </div>
            <div className="terminal-line system">
              [+] Target Device: <span className="highlight-cyan">{metadata.device_type}</span>
            </div>
            <div className="terminal-line system">
              [+] Method: <span className="highlight-cyan">{metadata.extraction_method}</span>
            </div>
            
            <div className="terminal-line system progress-line">
              [+] Bypassing encryption........ [ SUCCESS ]
            </div>

            <div className="terminal-data-box">
              <div className="data-box-header">
                <span>--- BEGIN RECOVERED PAYLOAD ---</span>
                <span className="blink-cursor">_</span>
              </div>
              <div className="data-payload">
                {metadata.recovered_data}
              </div>
              <div className="data-box-footer">
                <span>--- END OF FILE ---</span>
              </div>
            </div>

            <div className="terminal-line command">
              <span className="prompt">root@ccu-server:~$</span> <span className="blink-cursor">_</span>
            </div>
          </div>
        </div>
      );

      case 'trace_analysis': {
      // Deterministically generate a jagged mass spectrometry graph based on the Evidence ID
      const generatePeaks = (seed: number) => {
        let points = "0,100 ";
        for (let i = 1; i <= 20; i++) {
          const x = i * 5;
          // Generate pseudo-random peaks, with a few intentional large spikes
          const isMajorPeak = (seed * i) % 7 === 0;
          const y = isMajorPeak ? 10 + ((seed * i) % 20) : 75 + ((seed * i) % 20);
          points += `${x},${y} `;
        }
        points += "100,100";
        return points;
      };

      return (
        <div className="forensic-preview trace-paper">
          <div className="trace-header">
            <div className="trace-agency">ADVANCED MATERIALS & TRACE LAB</div>
            <h2 className="trace-title">MASS SPECTROMETRY ANALYSIS</h2>
          </div>
          
          <div className="trace-meta">
            <div><span className="trace-label">SAMPLE ID:</span> EX-{evidence.id.toString().padStart(3, '0')}</div>
            <div><span className="trace-label">SCAN DATE:</span> {new Date().toLocaleDateString()}</div>
          </div>

          <div className="trace-graph-box">
            <h4 className="trace-graph-title">SPECTRAL ABUNDANCE CHART</h4>
            <svg viewBox="0 0 100 100" className="trace-graph" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="25" x2="100" y2="25" className="trace-grid-line" />
              <line x1="0" y1="50" x2="100" y2="50" className="trace-grid-line" />
              <line x1="0" y1="75" x2="100" y2="75" className="trace-grid-line" />
              
              {/* Data Lines (Primary Blue, Secondary Red Overlay) */}
              <polyline points={generatePeaks(evidence.id)} className="trace-data-line primary-line" />
              <polyline points={generatePeaks(evidence.id + 1)} className="trace-data-line secondary-line" />
            </svg>
            <div className="trace-axis-labels">
              <span>m/z (Mass-to-Charge Ratio)</span>
              <span>Relative Abundance ➔</span>
            </div>
          </div>

          <div className="trace-results">
            <div className="trace-result-row">
              <span className="trace-label">MATERIAL COMPOSITION:</span>
              <span className="trace-value">{metadata.material_type}</span>
            </div>
            <div className="trace-result-row match-row">
              <span className="trace-label">IDENTIFIED ORIGIN SOURCE:</span>
              <span className="trace-value source-match">{metadata.origin_source}</span>
            </div>
          </div>

          <div className="trace-footer">
            <span>ANALYSIS COMPLETE</span>
            <span className="trace-signature">Auto-Generated System Report</span>
          </div>
        </div>
      );
    }

    case 'ballistics':
      return (
        <div className="forensic-preview ballistics-modal-viewer">
          <div className="ballistics-header">
            <div className="ballistics-agency-block">
              <div className="ballistics-agency">STATE FORENSIC LABORATORY</div>
              <h2 className="ballistics-title">DIVISION OF BALLISTICS & TOOLMARKS</h2>
              <div className="ballistics-sub-meta">CASE FILE #{metadata.case_number}</div>
              <div className="ballistics-lab-stamp">OFFICIAL LABORATORY REPORT</div>
            </div>
            <div className="ballistics-barcode">*{metadata.case_number}*</div>
          </div>

          <div className="ballistics-specimen-box">
            <div className="ballistics-specimen-title">EVIDENCE INTAKE LOG</div>
            {(metadata.exhibits || []).map((ex: any, idx: number) => (
              <div key={idx} className="ballistics-specimen-row">
                <span className="ballistics-specimen-label">{ex.reference}:</span>
                <span className="ballistics-specimen-desc" dangerouslySetInnerHTML={{ __html: ex.description }} />
              </div>
            ))}
            {(!metadata.exhibits || metadata.exhibits.length === 0) && (
              <div style={{ fontStyle: 'italic', color: '#666' }}>No physical exhibits recorded on intake.</div>
            )}
          </div>

          <div className="ballistics-section">
            <div className="ballistics-section-title">1. Firearm Specification Data</div>
            <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: metadata.firearm_specs }} />
          </div>

          <div className="ballistics-section">
            <div className="ballistics-section-title">2. Microscopic & Toolmark Analysis</div>
            <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: metadata.microscopic_analysis }} />
          </div>
          
          {evidence.img_url && (
            <div className="microscope-photo-attachment">
              <div className="microscope-tape"></div>
              <div className="microscope-comparison">
                <img src={evidence.img_url} alt="Microscopic Striations" className="microscope-image" />
                <div className="microscope-crosshair-v"></div>
                <div className="microscope-crosshair-h"></div>
                <div className="microscope-overlay-text">STRIATION ALIGNMENT LENS</div>
              </div>
            </div>
          )}

          {metadata.trajectory_range && (
            <div className="ballistics-section">
              <div className="ballistics-section-title">3. Trajectory & Range Findings</div>
              <div className="ballistics-text" dangerouslySetInnerHTML={{ __html: metadata.trajectory_range }} />
            </div>
          )}

          <div className="ballistics-conclusion-box">
            <div className="ballistics-conclusion" dangerouslySetInnerHTML={{ __html: metadata.conclusion }} />
          </div>

          <div className="ballistics-sign-off">
            <div className="ballistics-sign-content">
              <div className="signature-ink">{metadata.examiner_name}</div>
              <div className="ballistics-signature-line">SENIOR BALLISTICS EXPERT</div>
              <div className="ballistics-verified-id">VERIFIED LAB ID: {metadata.case_number}</div>
            </div>
          </div>

          {metadata.investigator_notes && (
            <div className="handwritten-note-overlay">
              {metadata.investigator_notes}
            </div>
          )}
        </div>
      );
  }
}