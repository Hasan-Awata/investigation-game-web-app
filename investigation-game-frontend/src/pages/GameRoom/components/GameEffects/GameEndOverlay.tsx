import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './GameEndOverlay.css'; 

interface GameEndOverlayProps {
  status: 'solved' | 'failed' | string;
  resolutionMessage: string | null;
  finalStats: any;
}

export default function GameEndOverlay({ status, resolutionMessage, finalStats }: GameEndOverlayProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (status !== 'solved' && status !== 'failed') return null;

  return (
    <div className="victory-overlay">
      <div className="victory-content" style={{ maxWidth: '800px', padding: '2rem' }}>

        {status === 'solved' ? (
          <>
            <div className="forensic-icon pulse" style={{ color: 'var(--accent-cyan)' }}>✧</div>
            <h1 className="victory-title" style={{ color: 'var(--accent-cyan)' }}>
              {t('pages.gameRoom.gameEndOverlay.caseClosed')}
            </h1>
            <p className="victory-subtitle">
              {resolutionMessage || t('pages.gameRoom.gameEndOverlay.caseClosedFallback')}
            </p>
          </>
        ) : (
          <>
            <div className="forensic-icon pulse" style={{ color: 'var(--accent-crimson)' }}>✕</div>
            <h1 className="victory-title" style={{ color: 'var(--accent-crimson)', textShadow: '0 0 30px rgba(163,50,50,0.4)' }}>
              {t('pages.gameRoom.gameEndOverlay.mandateRevoked')}
            </h1>
            <p className="victory-subtitle" style={{ color: 'var(--accent-crimson)' }}>
              {resolutionMessage || t('pages.gameRoom.gameEndOverlay.mandateRevokedFallback')}
            </p>
          </>
        )}

        {finalStats && (
          <div className="victory-stats-grid">
            <div className="stat-box">
              <span className="stat-label">{t('pages.gameRoom.gameEndOverlay.timeElapsed')}</span>
              <span className="stat-value">{finalStats.time_taken}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('pages.gameRoom.gameEndOverlay.xpGranted')}</span>
              <span className="stat-value highlight">{finalStats.xp_gained} <span className="stat-sub">/ {finalStats.max_xp}</span></span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('pages.gameRoom.gameEndOverlay.suspectsCaught')}</span>
              <span className="stat-value">{finalStats.suspects_caught} <span className="stat-sub">/ {finalStats.total_guilty}</span></span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{t('pages.gameRoom.gameEndOverlay.innocentsAccused')}</span>
              <span className={`stat-value ${finalStats.innocents_accused > 0 ? 'error' : 'success'}`}>
                {finalStats.innocents_accused}
              </span>
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem', width: '100%' }}>
          {t('pages.gameRoom.gameEndOverlay.returnToHq')}
        </button>
      </div>
    </div>
  );
}