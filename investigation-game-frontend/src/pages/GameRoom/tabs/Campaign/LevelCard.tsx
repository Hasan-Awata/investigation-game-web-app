import { useTranslation } from 'react-i18next';
import type { Level } from '@/types';
import './LevelCard.css';

interface LevelCardProps {
  level: Level;
  status: string;
  isSelected: boolean;
  displayTitle: string;
  onSelect: () => void;
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

export default function LevelCard({
  level,
  status,
  isSelected,
  displayTitle,
  onSelect
}: LevelCardProps) {
  const { t } = useTranslation();

  return (
    <div 
      className={`level-list-item ${status} ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="list-item-content">
        <div className="level-icon-container">
          {getLevelIcon(level.presentation_type)}
        </div>
        <div className="list-item-title-area">
          <span className="node-phase">
            {t('pages.gameRoom.campaign.lead', { id: level.order_index.toString().padStart(3, '0') })}
          </span>
          <h4 className="list-item-title">{displayTitle}</h4>
        </div>
      </div>
    </div>
  );
}