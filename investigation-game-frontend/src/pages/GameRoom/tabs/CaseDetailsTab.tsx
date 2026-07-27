import type { GameCase } from '../../../types';
import './Tabs.css';

interface CaseDetailsTabProps {
  gameCase: GameCase;
}

export default function CaseDetailsTab({ gameCase }: CaseDetailsTabProps) {
  // Utilizing a placeholder image for the cinematic hero background
  const heroImageUrl = `/assets/cases/case-${gameCase.id}.jpg`; 

  return (
    <div className="case-details-tab">
      
      {/* Cinematic Split-Pane / Hero Header */}
      <div className="case-hero-header">
        <div 
          className="case-hero-background" 
          style={{ backgroundImage: `url(${heroImageUrl}), url('/placeholder-crime-scene.jpg')` }}
        />
        <div className="case-hero-overlay">
          <div className="case-hero-content">
            <h1 className="case-hero-title">{gameCase.title}</h1>
            <div className="case-hero-badges">
              <span className="badge">Min XP: {gameCase.min_player_XP}</span>
              <span className="badge reward">Reward: {gameCase.XP_on_solve} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Narrative Section */}
      <div className="case-full-story">
        <h2 className="section-title">Official Briefing</h2>
        <div className="story-text-block">
          {gameCase.story.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </div>
      
    </div>
  );
}