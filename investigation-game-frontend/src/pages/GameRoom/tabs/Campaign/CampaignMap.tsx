import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { LevelPresentationType, Zone } from '@/types';
import ZoneCard from './ZoneCard';
import { assetUrl } from '@/utils/assetUrl';
import campaignMap from './CampaignMap.module.css';

interface CampaignMapProps {
  zones: Zone[];
  unlockedLevelIds: Set<number>;
  onEnterZone: (zoneId: number) => void;
  mapImageUrl?: string;
}

type ZonePinType = LevelPresentationType | 'mixed';

const MAP_SCALE = 1.03;
const pinDetails = {
  location: <>
    <circle cx="18" cy="16" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="21" y1="19" x2="24.5" y2="22.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </>,
  interrogation: <path d="M 25 12 H 15 C 13.3 12 12 13.3 12 15 V 20 C 12 21.7 13.3 23 15 23 H 17 L 17 26 L 21 23 H 25 C 26.7 23 28 21.7 28 20 V 15 C 28 13.3 26.7 12 25 12 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  mixed: <>
    <path d="M12 13 H17 L19 15 H28 V23 H12 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 16 H28" stroke="currentColor" strokeWidth="1.5" />
  </>,
};

const ZonePin = ({ type }: { type: ZonePinType }) => (
  <svg width="40" height="48" viewBox="0 0 40 48" fill="none" className={campaignMap['tactical-svg-pin']}>
    <path d="M 20 44 L 11 30 A 15 15 0 1 1 29 30 Z" fill="#141518" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    {pinDetails[type]}
  </svg>
);

function getFallbackCoordinates(index: number) {
  const row = Math.floor(index / 3);
  const column = index % 3;
  const x = row % 2 === 0 ? 20 + (column * 30) : 80 - (column * 30);
  const y = 20 + (row * 25);
  return { top: `${y}%`, left: `${x}%` };
}

export default function CampaignMap({ zones, unlockedLevelIds, onEnterZone, mapImageUrl }: CampaignMapProps) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const visibleZones = zones.flatMap(zone => {
    const discoveredLevels = zone.levels?.filter(level => level.is_initial || unlockedLevelIds.has(level.id));
    if (!discoveredLevels?.length) return [];

    const firstType = discoveredLevels[0].presentation_type;
    const hasKnownType = firstType === 'location' || firstType === 'interrogation';
    const pinType: ZonePinType = hasKnownType && discoveredLevels.every(level => level.presentation_type === firstType)
      ? firstType
      : 'mixed';
    return [{ zone, pinType, pinId: `zone-pin-${zone.id}` }];
  });
  const targetPinId = visibleZones.at(-1)?.pinId;

  return (
    <div className={campaignMap['campaign-map-container']}>
      <TransformWrapper
        initialScale={MAP_SCALE}
        minScale={MAP_SCALE}
        maxScale={MAP_SCALE}
        limitToBounds={true}
        disablePadding={true}
        wheel={{ disabled: true }}
        pinch={{ disabled: true }}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
      >
        {({ zoomToElement, centerView }) => (
          <TransformComponent
            wrapperClass={campaignMap['map-transform-wrapper']}
            contentClass={campaignMap['map-transform-content']}
          >
            <div className={campaignMap['custom-map-canvas']}>
              <img
                src={mapImageUrl ? assetUrl(mapImageUrl) : assetUrl('/Maps/tactical-damascus-blueprint.png')}
                alt="Tactical Region Map"
                className={campaignMap['custom-map-image']}
                onLoad={() => {
                  if (targetPinId) {
                    zoomToElement(targetPinId, MAP_SCALE, 0);
                  } else {
                    centerView(MAP_SCALE, 0);
                  }
                }}
              />

              <div className={campaignMap['map-overlay-grid']}></div>

              {visibleZones.map(({ zone, pinType, pinId }, index) => {
                const coords = zone.coord_x && zone.coord_y
                  ? { left: `${zone.coord_x}%`, top: `${zone.coord_y}%` }
                  : getFallbackCoordinates(index);

                return (
                  <div
                    key={zone.id}
                    id={pinId}
                    className={campaignMap['map-pin-wrapper']}
                    style={coords}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <ZonePin type={pinType} />
                    <div className={campaignMap['pin-tooltip']}>
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
