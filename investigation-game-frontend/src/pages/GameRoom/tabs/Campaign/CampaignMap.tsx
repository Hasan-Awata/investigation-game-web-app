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

  // 1. Identify the most advanced unlocked phase
  // Since phases are passed in chronological order, scanning backward finds the latest one instantly
  const newestUnlockedPhase = [...phases].reverse().find(phase => 
    phase.levels?.some(l => l.is_initial || unlockedLevelIds.has(l.id))
  );
  
  // 2. Generate the target ID for the camera to seek out
  const targetPinId = newestUnlockedPhase ? `phase-pin-${newestUnlockedPhase.id}` : null;

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
        initialScale={1.03} 
        minScale={1.03}     
        maxScale={1.03}
        limitToBounds={true}
        disablePadding={true}
        wheel={{ disabled: true }}
        pinch={{ disabled: true }}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }} 
      >
        {({ zoomToElement, centerView }) => (
          <TransformComponent wrapperClass="map-transform-wrapper" contentClass="map-transform-content">
            <div className="custom-map-canvas">
              <img
                src={mapImageUrl || '/tactical-damascus-blueprint.png'}
                alt="Tactical Map"
                className="custom-map-image"
                onLoad={() => {
                  // 3. The moment the image calculates its bounds, snap the camera
                  if (targetPinId) {
                    // scale: 1.03, animationTime: 0ms (Instant Snap)
                    zoomToElement(targetPinId, 1.03, 0);
                  } else {
                    centerView(1.03, 0);
                  }
                }}
              />

              <div className="map-overlay-grid"></div>

              {phases.map((phase, index) => {
                const isPhaseUnlocked = phase.levels?.some(l => l.is_initial || unlockedLevelIds.has(l.id));
                const coords = getCoordinates(index);

                return (
                  <div
                    key={phase.id}
                    id={`phase-pin-${phase.id}`} // 4. Anchor the ID to the specific pin
                    className={`map-pin-wrapper ${isPhaseUnlocked ? 'unlocked' : 'locked'}`}
                    style={{ ...coords, position: 'absolute' }}
                    onClick={() => {
                      if (isPhaseUnlocked) setSelectedPhase(phase);
                    }}
                  >
                    <div className="pin-icon"></div>
                    <div className="pin-tooltip">
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