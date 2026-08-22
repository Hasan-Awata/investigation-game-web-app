import type { Evidence } from '@/types';
import type { ForensicEvidence as ForensicEvType } from '@/types/evidence';
import './ForensicEvidence.css';

export default function ForensicEvidence({ evidence }: { evidence: Evidence }) {
  const forensicEv = evidence as ForensicEvType;
  const subType = forensicEv.sub_type || 'default';

  switch (subType) {
    case 'autopsy':
      return (
        <div className="forensic-variant autopsy-variant">
          {/* The clinical medical file envelope cover */}
          <div className="medical-file-cover">
            <div className="medical-header">
              <span className="medical-cross">✚</span>
              <span className="coroner-stamp">OFFICE OF THE MEDICAL EXAMINER</span>
            </div>
            
            <div className="forensic-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );

    case 'ballistics':
      return (
        <div className="forensic-variant ballistics-variant">
          {/* Jagged red tamper-evident tape */}
          <div className="evidence-tape">EVIDENCE - SEALED</div>
          
          <div className="ballistics-report">
            <div className="ballistics-header">
              <span className="crosshair-icon">⌖</span>
              <span className="lab-stamp">FIREARMS & TOOLMARKS UNIT</span>
            </div>
            
            <div className="forensic-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );
      
    case 'dna':
      return (
        <div className="forensic-variant dna-variant">
          {/* Yellow and black diagonal caution strip */}
          <div className="biohazard-strip"></div>
          
          <div className="dna-report">
            <div className="dna-header">
              <span className="dna-icon">🧬</span>
              <span className="lab-stamp">SEROLOGY & DNA PROFILE</span>
            </div>
            
            {/* The classic staggered DNA genetic bands */}
            <div className="dna-sequence-graphic"></div>
            
            <div className="forensic-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );

    case 'digital_forensics':
      return (
        <div className="forensic-variant digital-variant">
          {/* Rugged hardware casing detail at the top */}
          <div className="drive-casing-top"></div>
          
          {/* The inset terminal screen */}
          <div className="digital-screen">
            {/* CRT scanline overlay */}
            <div className="scanlines"></div>
            
            <div className="digital-header">
              <span className="terminal-prompt">{'>_'}</span>
              <span className="lab-stamp">DATA EXTRACTION REPORT</span>
            </div>
            
            <div className="forensic-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );

    case 'trace_analysis':
      return (
        <div className="forensic-variant trace-variant">
          {/* The plastic zipper seal at the top of the bag */}
          <div className="zipper-seal"></div>
          
          {/* The white sticker label slapped on the plastic bag */}
          <div className="trace-bag-label">
            <div className="trace-header">
              <span className="trace-icon">🔬</span>
              <span className="lab-stamp">MATERIALS & TRACE ANALYSIS</span>
            </div>
            
            <div className="forensic-text-content">
              <h4 className="evidence-title">{evidence.title}</h4>
              {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
            </div>
          </div>
        </div>
      );
      
    default:
      return (
        <div className="forensic-variant placeholder-forensic">
          <div className="forensic-header">
            <span className="forensic-icon">✧</span>
          </div>
          <h4 className="evidence-title">{evidence.title}</h4>
          {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
        </div>
      );
  }
}