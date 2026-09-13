import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Zone } from '@/types';
import ZoneCard from './ZoneCard';
import './CampaignMap.css';

interface CampaignMapProps {
  zones: Zone[];
  unlockedLevelIds: Set<number>;
  onEnterZone: (zoneId: number) => void;
  mapImageUrl?: string;
}

const LocationPin = () => (
  <svg width="40" height="48" viewBox="0 0 40 48" fill="none" className="tactical-svg-pin">
    <path d="M 20 44 L 11 30 A 15 15 0 1 1 29 30 Z" fill="#141518" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="18" cy="16" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="21" y1="19" x2="24.5" y2="22.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const InterrogationPin = () => (
  <svg width="40" height="48" viewBox="0 0 40 48" fill="none" className="tactical-svg-pin">
    <path d="M 20 44 L 11 30 A 15 15 0 1 1 29 30 Z" fill="#141518" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M 25 12 H 15 C 13.3 12 12 13.3 12 15 V 20 C 12 21.7 13.3 23 15 23 H 17 L 17 26 L 21 23 H 25 C 26.7 23 28 21.7 28 20 V 15 C 28 13.3 26.7 12 25 12 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const WiretapPin = () => (
  <svg width="40" height="48" viewBox="0 0 40 48" fill="none" className="tactical-svg-pin">
    <path d="M 20 44 L 11 30 A 15 15 0 1 1 29 30 Z" fill="#141518" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <g transform="translate(10, 8) scale(0.8)">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
    </g>
  </svg>
);

const MixedPin = () => (
  <svg width="40" height="48" viewBox="0 0 40 48" fill="none" className="tactical-svg-pin">
    <path d="M 20 44 L 11 30 A 15 15 0 1 1 29 30 Z" fill="#141518" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M12 13 H17 L19 15 H28 V23 H12 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 16 H28" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export default function CampaignMap({ zones, unlockedLevelIds, onEnterZone, mapImageUrl }: CampaignMapProps) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  // 1. FILTER: Zones only exist on the map if they contain at least one discovered lead.
  const visibleZones = zones.filter(zone => 
    zone.levels?.some(l => l.is_initial || unlockedLevelIds.has(l.id))
  );

  // 2. Identify the most recently discovered zone to anchor the camera
  const newestUnlockedZone = [...visibleZones].reverse()[0];
  const targetPinId = newestUnlockedZone ? `zone-pin-${newestUnlockedZone.id}` : null;

  // Fallback coordinate generation if the author didn't provide exact X/Y map points
  const getFallbackCoordinates = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const isEvenRow = row % 2 === 0;
    const x = isEvenRow ? 20 + (col * 30) : 80 - (col * 30);
    const y = 20 + (row * 25);
    return { top: `${y}%`, left: `${x}%` };
  };

  const getZoneIconType = (zone: Zone) => {
    const activeLevels = zone.levels?.filter(l => l.is_initial || unlockedLevelIds.has(l.id)) || [];
    if (activeLevels.length === 0) return 'mixed';
    
    // Create a unique set of presentation types currently visible in this zone
    const types = new Set(activeLevels.map(l => l.presentation_type));
    
    // If the zone strictly contains ONE type of encounter, return it. Otherwise, it's mixed.
    if (types.size === 1) {
      return types.values().next().value;
    }
    return 'mixed';
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
                src={mapImageUrl || '/Maps/tactical-damascus-blueprint.png'}
                alt="Tactical Region Map"
                className="custom-map-image"
                onLoad={() => {
                  if (targetPinId) {
                    zoomToElement(targetPinId, 1.03, 0);
                  } else {
                    centerView(1.03, 0);
                  }
                }}
              />

              <div className="map-overlay-grid"></div>

              {visibleZones.map((zone, index) => {
                const coords = zone.coord_x && zone.coord_y 
                  ? { left: `${zone.coord_x}%`, top: `${zone.coord_y}%` }
                  : getFallbackCoordinates(index);

                const zoneType = getZoneIconType(zone);

                return (
                  <div
                    key={zone.id}
                    id={`zone-pin-${zone.id}`}
                    className="map-pin-wrapper unlocked"
                    style={{ ...coords, position: 'absolute' }}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <div className="pin-icon">
                      {zoneType === 'interrogation' && <InterrogationPin />}
                      {zoneType === 'location' && <LocationPin />}
                      {zoneType === 'wiretap' && <WiretapPin />}
                      {(zoneType === 'mixed' || zoneType === 'standard' || !zoneType) && <MixedPin />}
                    </div>
                    <div className="pin-tooltip">
                      {zone.title}
                    </div>
                  </div>
                );

              })}
            </div>
          </TransformComponent>
        )}
      </TransformWrapper>

      {selectedZone && (
        <ZoneCard
          zone={selectedZone}
          unlockedLevelIds={unlockedLevelIds}
          onClose={() => setSelectedZone(null)}
          onEnter={onEnterZone}
        />
      )}
    </div>
  );
}