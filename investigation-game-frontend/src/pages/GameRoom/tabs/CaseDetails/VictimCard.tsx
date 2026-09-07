import type { Victim } from '../../../../types';
import './VictimCard.css';

interface VictimCardProps {
  victim: Victim;
  index: number;
  isNew: boolean;
  onClick: (victim: Victim) => void;
}

export default function VictimCard({ victim, index, isNew, onClick }: VictimCardProps) {
  return (
    <div
      className="victim-card"
      onClick={() => onClick(victim)}
    >
      {isNew && <div className="unread-indicator" title="New Casualty Intel"></div>}
      
      <div
        className="victim-card-image"
        style={{ backgroundImage: `url(${victim.img_url || '/placeholder-mugshot.jpg'})` }}
      />
      
      <div className="victim-card-info">
        <h4>{victim.name || `CASUALTY №${index + 1}`}</h4>
      </div>
    </div>
  );
}