import { useRoomContext } from '../../../context/RoomContext';
import './Tabs.css';

export default function CaseDetailsTab() {
  const { room } = useRoomContext();
  
  const gameCase = room.game_case || {
    id: room.case_id,
    title: "Case Data Missing",
    story: "The case metadata was not eager-loaded by the server.",
    min_player_XP: 0,
    XP_on_solve: 0,
    img_url: null
  };

  const heroImageUrl = gameCase.img_url || '/placeholder-crime-scene.jpg'; 

  return (
    <div className="case-details-tab">
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