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
    
    // Hit POST /rooms to generate the session in Laravel
    const result = await createRoom(gameCase.id);
    
    if (result.isSuccess) {
      // Transition to the new route using the generated invite code
      navigate(`/room/${result.value.invite_code}`);
    } else {
      setError(result.errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        
        <button className="close-btn" onClick={onClose} disabled={isLoading}>✕</button>
        
        <div className="modal-header">
          <h2 className="modal-title">{gameCase.title}</h2>
          <div className="modal-badges">
            <span className="badge">Min XP: {gameCase.min_player_XP}</span>
            <span className="badge reward">Reward: {gameCase.XP_on_solve} XP</span>
          </div>
        </div>

        <div className="modal-story-container">
          <p className="modal-story-text">{gameCase.story}</p>
        </div>

        {error && <div className="terminal-text error" style={{ padding: 0 }}>{error}</div>}

        <div className="modal-actions">
          {/* For now, both buttons initiate a session. You can separate solo/multiplayer logic later if needed. */}
          <button className="btn-primary" onClick={handleStartSession} disabled={isLoading}>
            {isLoading ? 'Encrypting...' : 'Start the Case'}
          </button>
          <button className="btn-secondary" onClick={handleStartSession} disabled={isLoading}>
            Multiplayer
          </button>
        </div>
      </div>
    </div>
  );
}