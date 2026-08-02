import { useState } from 'react';
import type { Evidence } from '../../../types';
import { useRoomContext } from '../../../context/RoomContext';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal'; 
import './EvidenceBoard.css';

export default function EvidenceBoardTab() {
  const { accumulatedEvidences, viewedItems, markItemAsViewed } = useRoomContext();
  const [inspectedEvidence, setInspectedEvidence] = useState<Evidence | null>(null);

  const handleInspect = (evidence: Evidence) => {
    setInspectedEvidence(evidence);
    markItemAsViewed(evidence.id);
  };

  return (
    <div className="evidence-board-container">
      <header className="board-header">
        <h2 className="section-title">The Evidence Board</h2>
        <span className="board-meta">pinned by the system • click to inspect</span>
      </header>
      
      <div className="acrylic-workspace">
        {accumulatedEvidences.length === 0 ? (
          <div className="terminal-text">No evidence recovered for this phase.</div>
        ) : (
          <div className="evidence-scatter-grid">
            {accumulatedEvidences.map((evidence, index) => (
              <EvidenceCard 
                key={evidence.id} 
                evidence={evidence} 
                index={index}
                isNew={!viewedItems.has(evidence.id)} 
                onInspect={handleInspect} 
              />
            ))}
          </div>
        )}
      </div>

      <EvidenceModal 
        evidence={inspectedEvidence} 
        onClose={() => setInspectedEvidence(null)} 
      />
    </div>
  );
}