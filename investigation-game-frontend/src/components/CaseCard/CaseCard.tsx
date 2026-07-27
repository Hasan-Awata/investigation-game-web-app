import type { GameCase } from '../../types';
import './CaseCard.css';

interface CaseCardProps {
  gameCase: GameCase;
  imageUrl?: string;
}

export default function CaseCard({ gameCase, imageUrl }: CaseCardProps) {
  return (
    <div className={`case-card ${gameCase.is_solved ? 'is-solved' : ''}`}>
      <div 
        className="case-card-background" 
        style={{ backgroundImage: `url(${imageUrl || '/placeholder-crime-scene.jpg'})` }}
      />
      <div className="case-card-overlay" />
      
      {/* The Case Closed Stamp */}
      {gameCase.is_solved && (
        <div className="solved-stamp-container">
          <span className="solved-stamp">CASE CLOSED</span>
        </div>
      )}
      
      <div className="case-card-badges">
        <span className="badge">Min XP: {gameCase.min_player_XP}</span>
        <span className="badge reward">Reward: {gameCase.XP_on_solve} XP</span>
      </div>

      <div className="case-card-content">
        <h3 className="case-title">{gameCase.title}</h3>
      </div>
    </div>
  );
}