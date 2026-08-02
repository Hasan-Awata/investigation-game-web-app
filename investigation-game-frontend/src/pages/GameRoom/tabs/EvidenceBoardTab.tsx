import { useState } from 'react';
import type { Evidence } from '../../../types';
import { useRoomContext } from '../../../context/RoomContext';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal'; 
import './EvidenceBoard.css';

export default function EvidenceBoardTab() {
  const { room, accumulatedEvidences } = useRoomContext();
  const [inspectedEvidence, setInspectedEvidence] = useState<Evidence | null>(null);

  // Initialize viewed state from sessionStorage to persist across tab switches
  const viewedStorageKey = `room_${room.id}_viewed_evidence`;
  const [viewedEvidences, setViewedEvidences] = useState<Set<number>>(() => {
    const stored = sessionStorage.getItem(viewedStorageKey);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Intercept the inspect action to mark the item as viewed
  const handleInspect = (evidence: Evidence) => {
    setInspectedEvidence(evidence);
    if (!viewedEvidences.has(evidence.id)) {
      const nextViewed = new Set(viewedEvidences);
      nextViewed.add(evidence.id);
      setViewedEvidences(nextViewed);
      sessionStorage.setItem(viewedStorageKey, JSON.stringify(Array.from(nextViewed)));
    }
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
                isNew={!viewedEvidences.has(evidence.id)} 
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