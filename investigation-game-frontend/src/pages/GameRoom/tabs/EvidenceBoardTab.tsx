import { useState } from 'react';
import type { Evidence } from '../../../types';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal'; // <-- Import the modal
import './EvidenceBoard.css';

interface EvidenceBoardTabProps {
  evidences: Evidence[];
}

export default function EvidenceBoardTab({ evidences }: EvidenceBoardTabProps) {
  // Add state to track the clicked item
  const [inspectedEvidence, setInspectedEvidence] = useState<Evidence | null>(null);

  return (
    <div className="evidence-board-container">
      <header className="board-header">
        <h2 className="section-title">The Evidence Board</h2>
        <span className="board-meta">pinned by the system • click to inspect</span>
      </header>
      
      <div className="acrylic-workspace">
        {evidences.length === 0 ? (
          <div className="terminal-text">No evidence recovered for this phase.</div>
        ) : (
          <div className="evidence-scatter-grid">
            {evidences.map((evidence, index) => (
              <EvidenceCard 
                key={evidence.id} 
                evidence={evidence} 
                index={index} 
                onInspect={setInspectedEvidence} // <-- Pass the state setter
              />
            ))}
          </div>
        )}
      </div>

      {/* Render the modal outside the workspace flow */}
      <EvidenceModal 
        evidence={inspectedEvidence} 
        onClose={() => setInspectedEvidence(null)} 
      />
    </div>
  );
}