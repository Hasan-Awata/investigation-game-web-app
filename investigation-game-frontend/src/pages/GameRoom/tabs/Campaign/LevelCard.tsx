import { useTranslation } from 'react-i18next';
import type { Level } from '@/types';
import UndiscoveredLevelIcon from './UndiscoveredLevelIcon';
import levelCard from './LevelCard.module.css';

interface LevelCardProps {
  level: Level;
  status: 'undiscovered' | 'gated' | 'actionable' | 'completed';
  isSelected: boolean;
  displayTitle: string;
  onSelect: () => void;
  disabled?: boolean;
}

const getLevelIcon = (type?: string) => {
  switch (type) {
    case 'undiscovered':
      return <UndiscoveredLevelIcon />;
    case 'interrogation':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case 'location':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
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
  onSelect,
  disabled = false
}: LevelCardProps) {
  const { t } = useTranslation();
  const phaseLabel = t(`pages.gameRoom.campaign.types.${level.presentation_type || 'interrogation'}`);

  return (
    <button
      type="button"
      className={`${levelCard['level-list-item']} ${levelCard[status] || ''} ${isSelected ? levelCard['selected'] : ''}`}
      aria-pressed={isSelected}
      aria-label={status === 'completed' ? `${displayTitle}, ${phaseLabel}, ${t('pages.gameRoom.campaign.completed', 'Completed')}` : undefined}
      disabled={disabled || status === 'undiscovered'}
      onClick={onSelect}
    >
      <span className={levelCard['list-item-content']}>
        <span className={levelCard['level-icon-container']}>
          {getLevelIcon(status === 'undiscovered' ? 'undiscovered' : level.presentation_type)}
        </span>
        <span className={levelCard['list-item-title-area']}>
          <span className={levelCard['list-item-title']}>{displayTitle}</span>
          <span className={levelCard['node-phase']}>
            {phaseLabel}
          </span>
        </span>
      </span>
    </button>
  );
}
