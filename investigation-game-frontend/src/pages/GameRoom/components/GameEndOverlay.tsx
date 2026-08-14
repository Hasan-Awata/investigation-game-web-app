// FILE: src/pages/GameRoom/components/GameEndOverlay.tsx
import { useNavigate } from 'react-router-dom';

interface GameEndOverlayProps {
  status: 'solved' | 'failed' | string;
  resolutionMessage: string | null;
  finalStats: any;
}

export default function GameEndOverlay({ status, resolutionMessage, finalStats }: GameEndOverlayProps) {
  const navigate = useNavigate();
  
  if (status !== 'solved' && status !== 'failed') return null;

  return (
    <div className="victory-overlay">
      <div className="victory-content" style={{ maxWidth: '800px', padding: '2rem' }}>
        
        {status === 'solved' ? (
          <>
            <div className="forensic-icon pulse" style={{ color: 'var(--accent-cyan)' }}>✧</div>
            <h1 className="victory-title" style={{ color: 'var(--accent-cyan)' }}>CASE CLOSED</h1>
            <p className="victory-subtitle">{resolutionMessage || 'The truth is uncovered. Excellent work.'}</p>
          </>
        ) : (
          <>
            <div className="forensic-icon pulse" style={{ color: 'var(--accent-crimson)' }}>✕</div>
            <h1 className="victory-title" style={{ color: 'var(--accent-crimson)', textShadow: '0 0 30px rgba(163,50,50,0.4)' }}>
              MANDATE REVOKED
            </h1>
            <p className="victory-subtitle" style={{ color: 'var(--accent-crimson)' }}>
              {resolutionMessage || 'The evidence was misread. The guilty walk free, and the innocent pay the price.'}
            </p>
          </>
        )}

        {finalStats && (
          <div className="victory-stats-grid">
            <div className="stat-box">
              <span className="stat-label">Time Elapsed</span>
              <span className="stat-value">{finalStats.time_taken}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">XP Granted</span>
              <span className="stat-value highlight">{finalStats.xp_gained} <span className="stat-sub">/ {finalStats.max_xp}</span></span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Suspects Caught</span>
              <span className="stat-value">{finalStats.suspects_caught} <span className="stat-sub">/ {finalStats.total_guilty}</span></span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Innocents Accused</span>
              <span className={`stat-value ${finalStats.innocents_accused > 0 ? 'error' : 'success'}`}>
                {finalStats.innocents_accused}
              </span>
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem', width: '100%' }}>
          Return to Headquarters
        </button>
      </div>
    </div>
  );
}