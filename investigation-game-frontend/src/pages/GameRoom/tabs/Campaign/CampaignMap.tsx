import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Phase } from '@/types';
import PhaseCard from './PhaseCard';
import './CampaignMap.css';

interface CampaignMapProps {
  phases: Phase[];
  unlockedLevelIds: Set<number>;
  onEnterPhase: (phaseId: number) => void;
  mapImageUrl?: string;
}

export default function CampaignMap({ phases, unlockedLevelIds, onEnterPhase, mapImageUrl }: CampaignMapProps) {
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);

  const getCoordinates = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const isEvenRow = row % 2 === 0;
    
    const x = isEvenRow ? 20 + (col * 30) : 80 - (col * 30);
    const y = 20 + (row * 25);
    
    return { top: `${y}%`, left: `${x}%` };
  };

  return (
    <div className="campaign-map-container">
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={1}
        limitToBounds={true}
        centerOnInit={true}
        wheel={{ disabled: true }}
        pinch={{ disabled: true }}
        doubleClick={{ disabled: true }}
      >
        {({ resetTransform }) => (
          <TransformComponent wrapperClass="map-transform-wrapper" contentClass="map-transform-content">
            <div className="custom-map-canvas">
              <img 
                src={mapImageUrl || '/tactical-damascus-blueprint.png'} 
                alt="Tactical Map" 
                className="custom-map-image" 
                onLoad={() => {
                  resetTransform();
                }}
              />
              
              <div className="map-overlay-grid"></div>

              {phases.map((phase, index) => {
                const isPhaseUnlocked = phase.levels?.some(l => l.is_initial || unlockedLevelIds.has(l.id));
                const coords = getCoordinates(index);

                return (
                  <div
                    key={phase.id}
                    className={`map-pin-wrapper ${isPhaseUnlocked ? 'unlocked' : 'locked'}`}
                    style={{ ...coords, position: 'absolute' }}
                    onClick={() => {
                      if (isPhaseUnlocked) setSelectedPhase(phase);
                    }}
                  >
                    <div className="pin-icon"></div>
                    <div className="pin-tooltip">
                      <span className="pin-order-badge">{index + 1}</span>
                      {phase.title} {!isPhaseUnlocked && '🔒'}
                    </div>
                  </div>
                );
              })}
            </div>
          </TransformComponent>
        )}
      </TransformWrapper>

      {selectedPhase && (
        <PhaseCard 
          phase={selectedPhase} 
          unlockedLevelIds={unlockedLevelIds} 
          onClose={() => setSelectedPhase(null)} 
          onEnter={onEnterPhase} 
        />
      )}
    </div>
  );
}