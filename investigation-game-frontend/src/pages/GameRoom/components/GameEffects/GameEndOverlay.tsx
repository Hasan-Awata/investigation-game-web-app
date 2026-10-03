import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import gameEndOverlayStyles from './GameEndOverlay.module.css'; 

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
    <div className={gameEndOverlayStyles['victory-overlay']}>
      <div className={gameEndOverlayStyles['victory-content']} style={{ maxWidth: '800px', padding: '2rem' }}>

        {status === 'solved' ? (
          <>
            <div className={`${gameEndOverlayStyles['forensic-icon']} ${gameEndOverlayStyles['pulse']}`} style={{ color: 'var(--accent-cyan)' }}>✧</div>
            <h1 className={gameEndOverlayStyles['victory-title']} style={{ color: 'var(--accent-cyan)' }}>
              {t('pages.gameRoom.gameEndOverlay.caseClosed')}
            </h1>
            <p className={gameEndOverlayStyles['victory-subtitle']}>
              {resolutionMessage || t('pages.gameRoom.gameEndOverlay.caseClosedFallback')}
            </p>
          </>
        ) : (
          <>
            <div className={`${gameEndOverlayStyles['forensic-icon']} ${gameEndOverlayStyles['pulse']}`} style={{ color: 'var(--accent-crimson)' }}>✕</div>
            <h1 className={gameEndOverlayStyles['victory-title']} style={{ color: 'var(--accent-crimson)', textShadow: '0 0 30px rgba(163,50,50,0.4)' }}>
              {t('pages.gameRoom.gameEndOverlay.mandateRevoked')}
            </h1>
            <p className={gameEndOverlayStyles['victory-subtitle']} style={{ color: 'var(--accent-crimson)' }}>
              {resolutionMessage || t('pages.gameRoom.gameEndOverlay.mandateRevokedFallback')}
            </p>
          </>
        )}

        {finalStats && (
          <div className={gameEndOverlayStyles['victory-stats-grid']}>
            <div className={gameEndOverlayStyles['stat-box']}>
              <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.timeElapsed')}</span>
              <span className={gameEndOverlayStyles['stat-value']}>{finalStats.time_taken}</span>
            </div>
            <div className={gameEndOverlayStyles['stat-box']}>
              <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.xpGranted')}</span>
              <span className={`${gameEndOverlayStyles['stat-value']} ${gameEndOverlayStyles['highlight']}`}>{finalStats.xp_gained} <span className={gameEndOverlayStyles['stat-sub']}>/ {finalStats.max_xp}</span></span>
            </div>
            <div className={gameEndOverlayStyles['stat-box']}>
              <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.suspectsCaught')}</span>
              <span className={gameEndOverlayStyles['stat-value']}>{finalStats.suspects_caught} <span className={gameEndOverlayStyles['stat-sub']}>/ {finalStats.total_guilty}</span></span>
            </div>
            <div className={gameEndOverlayStyles['stat-box']}>
              <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.innocentsAccused')}</span>
              <span className={`${gameEndOverlayStyles['stat-value']}${finalStats.innocents_accused > 0 ? gameEndOverlayStyles['error'] : gameEndOverlayStyles['success']}`}>
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