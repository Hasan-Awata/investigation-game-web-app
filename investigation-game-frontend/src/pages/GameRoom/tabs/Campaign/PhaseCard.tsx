import { useTranslation } from 'react-i18next';
import type { Phase } from '@/types';
import './PhaseCard.css';

interface PhaseCardProps {
  phase: Phase;
  unlockedLevelIds: Set<number>;
  onClose: () => void;
  onEnter: (phaseId: number) => void;
}

export default function PhaseCard({ phase, unlockedLevelIds, onClose, onEnter }: PhaseCardProps) {
  const { t } = useTranslation();

  const levels = phase.levels ? [...phase.levels].sort((a, b) => a.order_index - b.order_index) : [];

  return (
    <div className="phase-card-overlay" onClick={onClose}>
      <div className="phase-card-content glass-panel" onClick={e => e.stopPropagation()}>
        
        <div className="hud-corner top-left"></div>
        <div className="hud-corner bottom-right"></div>
        <div className="hud-scanline"></div>

        <button className="close-btn hud-close" onClick={onClose}>
          [ {t('pages.gameRoom.campaign.map.closeEsc')} ]
        </button>

        <div className="phase-card-header">
          <span className="phase-card-meta">
            // {t('pages.gameRoom.campaign.map.phaseSysIndex', { index: phase.order_index })}
          </span>
          <h2 className="phase-card-title">{phase.title}</h2>
        </div>

        <p className="phase-card-desc">
          {phase.description || t('pages.gameRoom.campaign.map.noDescription')}
        </p>

        <div className="phase-card-levels-container">
          <div className="levels-heading-wrapper">
            <h4 className="levels-heading">{t('pages.gameRoom.campaign.map.levelsPreview')}</h4>
            <span className="levels-count">
              [{t('pages.gameRoom.campaign.map.entriesCount', { count: levels.length })}]
            </span>
          </div>
          
          <ul className="levels-preview-list">
            {levels.map(level => {
              const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
              return (
                <li key={level.id} className={`level-preview-item ${isDiscovered ? 'unlocked' : 'locked'}`}>
                  <span className="level-icon">{isDiscovered ? '⌖' : '🔒'}</span>
                  <div className="level-data">
                    <span className="level-title">
                      {isDiscovered ? level.title : t('pages.gameRoom.campaign.undiscoveredEncounter')}
                    </span>
                    <span className="level-status-text">
                      {isDiscovered ? t('pages.gameRoom.campaign.map.dataAvailable') : t('pages.gameRoom.campaign.map.restricted')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <button className="btn-primary enter-location-btn tactical-engage-btn" onClick={() => onEnter(phase.id)}>
          {t('pages.gameRoom.campaign.map.goToLocation')}
        </button>
      </div>
    </div>
  );
}