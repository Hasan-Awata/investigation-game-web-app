import type { Evidence } from '@/types';
import './AudioEvidence.css';

export default function AudioEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <div className="audio-variant cassette-tape">
      {/* Printed directly on the dark plastic casing */}
      <div className="cassette-top-area">
        <div className="label-header">
          <span className="audio-icon">⏺</span>
          <span className="tape-indicator">A-SIDE</span>
        </div>
        
        {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
      </div>

      {/* The clear plastic window showing the tape reels */}
      <div className="cassette-window">
        <div className="reel left-reel"></div>
        <div className="reel right-reel"></div>
      </div>

      {/* The bottom mechanical casing */}
      <div className="cassette-bottom">
        <div className="screw left-screw"></div>
        
        {/* The piece of white tape slapped on the bottom */}
        <div className="title-tape">
          <h4 className="evidence-title">{evidence.title}</h4>
        </div>

        <div className="screw right-screw"></div>
      </div>
    </div>
  );
}