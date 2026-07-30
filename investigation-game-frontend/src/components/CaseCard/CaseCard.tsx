import type { GameCase } from '../../types';
import './CaseCard.css';

interface CaseCardProps {
  gameCase: GameCase;
  imageUrl?: string;
}

export default function CaseCard({ gameCase, imageUrl }: CaseCardProps) {
  const isSolved = gameCase.user_status === 'solved';
  const isFailed = gameCase.user_status === 'failed';

  return (
    <div className={`case-card ${isSolved || isFailed ? 'is-solved' : ''}`}>
      <div 
        className="case-card-background" 
        style={{ backgroundImage: `url(${imageUrl || '/placeholder-crime-scene.jpg'})` }}
      />
      <div className="case-card-overlay" />
      
      {isSolved && (
        <div className="solved-stamp-container">
          <span className="solved-stamp">CASE CLOSED</span>
        </div>
      )}

      {isFailed && (
        <div className="solved-stamp-container">
          <span className="solved-stamp" style={{ borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }}>FAILED</span>
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