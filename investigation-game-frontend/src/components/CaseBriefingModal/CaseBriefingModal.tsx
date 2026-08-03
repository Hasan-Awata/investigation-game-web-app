import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameCase } from '../../types';
import { createRoom } from '../../services/api';
import './CaseBriefingModal.css';

interface CaseBriefingModalProps {
  gameCase: GameCase;
  onClose: () => void;
}

export default function CaseBriefingModal({ gameCase, onClose }: CaseBriefingModalProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = async () => {
    setIsLoading(true);
    setError(null);
    const result = await createRoom(gameCase.id);
    if (result.isSuccess) {
      navigate(`/room/${result.value.invite_code}`);
    } else {
      setError(result.errorMessage);
      setIsLoading(false);
    }
  };

  const userStatus = gameCase.user_status;
  const isFinished = userStatus === 'solved' || userStatus === 'failed';
  const activeInviteCode = gameCase.active_room_invite_code;
  
  // If the backend provides an invite code, it means they are currently mid-session.
  const showContinue = !!activeInviteCode;

  // Refined button text mapping to account for active replays vs starting fresh
  let primaryButtonText = 'Start the Case';
  if (isLoading) {
    primaryButtonText = 'Encrypting...';
  } else if (activeInviteCode) {
    primaryButtonText = 'Restart Case'; 
  } else if (isFinished) {
    primaryButtonText = 'Replay Case'; 
  }
  
  let rewardText = `${gameCase.XP_on_solve} XP`;
  let rewardColor = 'var(--accent-amber)';
  
  if (userStatus === 'solved') {
    rewardText = `0 XP (REPLAY)`;
    rewardColor = 'var(--text-secondary)';
  } else if (userStatus === 'failed') {
    rewardText = `${Math.floor(gameCase.XP_on_solve / 2)} XP (PENALTY)`;
    rewardColor = 'var(--accent-crimson)';
  }

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= Math.round(rating) ? 'var(--accent-amber)' : 'rgba(255,255,255,0.1)', fontSize: '1.2rem' }}>★</span>
      );
    }
    return stars;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} disabled={isLoading}>✕</button>
        
        <div className="modal-header">
          <h2 className="modal-title">{gameCase.title}</h2>
          <div className="modal-author">Authored by {gameCase.author_name || 'System'}</div>
        </div>

        <div className="modal-dossier-layout">
          <div className="modal-story-container">
            <div className="dossier-tags">
              {gameCase.tags?.map((tag, idx) => (
                <span key={idx} className="dossier-tag-pill">{tag}</span>
              ))}
            </div>
            <p className="modal-story-text">{gameCase.story}</p>
          </div>

          <div className="modal-metadata-sidebar">
            <div className="meta-block">
              <span className="meta-label">Player Rating</span>
              <div className="meta-value">{renderStars(gameCase.rating_stars || 0)} <span style={{fontSize: '0.8rem', marginLeft: '0.5rem'}}>({gameCase.rating_stars || 'N/A'})</span></div>
            </div>
            
            <div className="meta-block">
              <span className="meta-label">Difficulty</span>
              <div className="meta-value" style={{ color: 'var(--accent-crimson)' }}>{gameCase.difficulty || 'Standard'}</div>
            </div>
            
            <div className="meta-block">
              <span className="meta-label">Est. Playtime</span>
              <div className="meta-value">{gameCase.estimated_playtime || 'Unknown'}</div>
            </div>

            <div className="meta-block">
              <span className="meta-label">Advisory</span>
              <div className="meta-value advisory-badge">{gameCase.age_rating || 'Unrated'}</div>
            </div>

            <div className="meta-block" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <span className="meta-label">Access Requirements</span>
              <div className="modal-badges" style={{ marginTop: '0.5rem', flexDirection: 'column' }}>
                <span className="badge">Min XP: {gameCase.min_player_XP}</span>
                <span className="badge reward" style={{ color: rewardColor, borderColor: rewardColor }}>
                  Reward: {rewardText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="terminal-text error" style={{ padding: 0 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn-primary" onClick={handleStartSession} disabled={isLoading}>
            {primaryButtonText}
          </button>
          
          {showContinue && (
            <button 
              className="btn-secondary" 
              onClick={() => navigate(`/room/${activeInviteCode}`)} 
              disabled={isLoading}
              style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
            >
              Continue Investigation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}