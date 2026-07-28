import { useState } from 'react';
import type { Evidence } from '../../../types';
import { useRoomContext } from '../../../context/RoomContext';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal'; 
import './EvidenceBoard.css';

export default function EvidenceBoardTab() {
  const { room, accumulatedEvidences } = useRoomContext();
  const [inspectedEvidence, setInspectedEvidence] = useState<Evidence | null>(null);

  // Extract the IDs of the evidence the team successfully unlocked
  const unlockedEvidenceIds = new Set((room.unlocked_evidences || []).map(e => e.id));
  const currentLevelIndex = room.game_case?.levels?.find(l => l.id === room.current_level_id)?.order_index || 0;

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
              
              // Check if the evidence belongs to an optional choice
              // We do this by checking if ANY choice in the game unlocks this evidence ID
              const isUnlockable = room.game_case?.levels?.some(l => 
                l.questions?.some(q => 
                  q.choices?.some(c => c.unlocks_evidence_id === evidence.id)
                )
              );

              const hasAcquired = unlockedEvidenceIds.has(evidence.id);
              
              // Determine if the level this evidence belongs to is already passed
              const evidenceLevelIndex = room.game_case?.levels?.find(l => l.id === evidence.level_id)?.order_index || 0;
              const isPastLevel = evidenceLevelIndex < currentLevelIndex || room.status === 'solved';

              // If it requires an unlock, wasn't acquired, and the phase is over: HAUNT THEM.
              if (isUnlockable && !hasAcquired && isPastLevel) {
                return (
                  <div key={`missed-${evidence.id}`} className={`evidence-card-wrapper item-${index % 5}`}>
                    <div className="evidence-variant" style={{ background: '#1a1a1a', border: '1px dashed #FF3366', opacity: 0.7, filter: 'grayscale(100%)' }}>
                      <div className="digital-pin crimson"></div>
                      <h4 className="evidence-title" style={{ color: '#FF3366', textDecoration: 'line-through' }}>DATA CORRUPTED</h4>
                      <span className="evidence-id">EX-{evidence.id.toString().padStart(3, '0')}</span>
                      <p className="evidence-desc" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Intel permanently lost due to flawed narrative deduction in Phase {evidenceLevelIndex}.
                      </p>
                    </div>
                  </div>
                );
              }

              // If it requires an unlock, and they haven't acquired it yet (and the level is still active), hide it completely so as not to spoil the current puzzle.
              if (isUnlockable && !hasAcquired && !isPastLevel) {
                return null;
              }

              // Otherwise, render the acquired evidence normally
              return (
                <EvidenceCard 
                  key={evidence.id} 
                  evidence={evidence} 
                  index={index} 
                  onInspect={setInspectedEvidence} 
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