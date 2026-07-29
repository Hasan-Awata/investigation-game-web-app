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

  const unlockedEvidenceIds = new Set((room.unlocked_evidences || []).map(e => e.id));
  const currentLevelIndex = room.game_case?.levels?.find(l => l.id === room.current_level_id)?.order_index || 0;

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
            {accumulatedEvidences.map((evidence, index) => {
              
              const isUnlockable = room.game_case?.levels?.some(l => 
                l.questions?.some(q => 
                  q.choices?.some(c => c.unlocks_evidence_id === evidence.id)
                )
              );

              const hasAcquired = unlockedEvidenceIds.has(evidence.id);
              const evidenceLevelIndex = room.game_case?.levels?.find(l => l.id === evidence.level_id)?.order_index || 0;
              const isPastLevel = evidenceLevelIndex < currentLevelIndex || room.status === 'solved';

              if (isUnlockable && !hasAcquired && isPastLevel) {
                return (
                  <div key={`missed-${evidence.id}`} className={`evidence-card-wrapper item-${index % 5}`}>
                    <div className="evidence-variant" style={{ background: '#1a1a1a', border: '1px dashed #FF3366', opacity: 0.7, filter: 'grayscale(100%)' }}>
                      <h4 className="evidence-title" style={{ color: '#FF3366', textDecoration: 'line-through' }}>DATA CORRUPTED</h4>
                      <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
                      <p className="evidence-desc" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Intel permanently lost due to flawed narrative deduction in Phase {evidenceLevelIndex}.
                      </p>
                    </div>
                  </div>
                );
              }

              if (isUnlockable && !hasAcquired && !isPastLevel) {
                return null;
              }

              return (
                <EvidenceCard 
                  key={evidence.id} 
                  evidence={evidence} 
                  index={index}
                  isNew={!viewedEvidences.has(evidence.id)} 
                  onInspect={handleInspect} 
                />
              );
            })}
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