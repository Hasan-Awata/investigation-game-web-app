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
  
  // Guarantee chronological display order
  const levels = phase.levels ? [...phase.levels].sort((a, b) => a.order_index - b.order_index) : [];

  return (
    <div className="phase-card-overlay" onClick={onClose}>
      <div className="phase-card-content glass-panel" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <div className="phase-card-header">
          <span className="phase-card-meta">{t('pages.gameRoom.campaign.map.phaseIndex')} {phase.order_index}</span>
          <h2 className="phase-card-title">{phase.title}</h2>
        </div>

        <p className="phase-card-desc">
          {phase.description || t('pages.gameRoom.campaign.map.noDescription')}
        </p>

        <div className="phase-card-levels-container">
          <h4 className="levels-heading">{t('pages.gameRoom.campaign.map.levelsPreview')}</h4>
          <ul className="levels-preview-list">
            {levels.map(level => {
              const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
              return (
                <li key={level.id} className={`level-preview-item ${isDiscovered ? 'unlocked' : 'locked'}`}>
                  <span className="level-icon">{isDiscovered ? '📍' : '🔒'}</span>
                  <span className="level-title">
                    {isDiscovered ? level.title : t('pages.gameRoom.campaign.undiscoveredEncounter')}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <button className="btn-primary enter-location-btn" onClick={() => onEnter(phase.id)}>
          {t('pages.gameRoom.campaign.map.goToLocation')}
        </button>
      </div>
    </div>
  );
}