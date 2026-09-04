import { useTranslation } from 'react-i18next';
import type { Phase } from '@/types';
import './PhaseCard.css';

interface PhaseCardProps {
  phase: Phase;
  unlockedLevelIds: Set<number>;
  onClose: () => void;
  onEnter: (phaseId: number) => void;
}

const getLevelIcon = (type?: string) => {
  switch (type) {
    case 'interrogation':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case 'location':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      );
    case 'wiretap':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
      );
  }
};

export default function PhaseCard({ phase, unlockedLevelIds, onClose, onEnter }: PhaseCardProps) {
  const { t } = useTranslation();

  const levels = phase.levels ? [...phase.levels].sort((a, b) => a.order_index - b.order_index) : [];

  return (
    <div className="phase-card-overlay" onClick={onClose}>
      <div className="phase-card-content glass-panel" onClick={e => e.stopPropagation()}>

        <button className="close-btn" onClick={onClose} title="Close">
          ✕
        </button>

        <div className="phase-card-header">
          <h2 className="phase-card-title">{phase.title}</h2>
        </div>

        <p className="phase-card-desc">
          {phase.description || t('pages.gameRoom.campaign.map.noDescription')}
        </p>

        <div className="phase-card-levels-container">
          <div className="levels-heading-wrapper">
            <h4 className="levels-heading">{t('pages.gameRoom.campaign.map.levelsPreview')}</h4>
            <span className="levels-count">
              {t('pages.gameRoom.campaign.map.entriesCount', { count: levels.length })}
            </span>
          </div>

          <ul className="levels-preview-list">
            {levels.map(level => {
              const isDiscovered = level.is_initial || unlockedLevelIds.has(level.id);
              return (
                <li key={level.id} className={`level-preview-item ${isDiscovered ? 'unlocked' : 'locked'}`}>
                  <div className="level-preview-icon">
                    {isDiscovered ? getLevelIcon(level.presentation_type) : '🔒'}
                  </div>
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

        <div className="phase-card-actions">
          <button className="btn-primary" onClick={() => onEnter(phase.id)} style={{ width: '100%' }}>
            {t('pages.gameRoom.campaign.map.goToLocation')}
          </button>
        </div>
      </div>
    </div>
  );
}