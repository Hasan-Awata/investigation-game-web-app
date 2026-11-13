import PopupAction from '@/components/PopupAction';
import PopupDialog from '@/components/PopupDialog';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FinalStats } from '@/types';
import { getLocalUser } from '@/utils/userState';
import gameEndOverlayStyles from './GameEndOverlay.module.css';

interface GameEndOverlayProps {
  status: 'solved' | 'failed' | string;
  resolutionMessage: string | null;
  finalStats: FinalStats | null;
}

export default function GameEndOverlay({ status, resolutionMessage, finalStats }: GameEndOverlayProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userId = getLocalUser()?.id;
  const awardedXp = userId === undefined ? finalStats?.xp_gained
    : finalStats?.xp_awards?.[userId] ?? finalStats?.xp_gained;

  if (status !== 'solved' && status !== 'failed') return null;

  return (
    <PopupDialog title={t(status === 'solved' ? 'pages.gameRoom.gameEndOverlay.caseClosed' : 'pages.gameRoom.gameEndOverlay.mandateRevoked')}
      tone={status === 'solved' ? 'success' : 'error'}
      actions={<PopupAction primary onClick={() => navigate('/')}>{t('pages.gameRoom.gameEndOverlay.returnToHq')}</PopupAction>}>
      <p>{resolutionMessage || t(status === 'solved' ? 'pages.gameRoom.gameEndOverlay.caseClosedFallback' : 'pages.gameRoom.gameEndOverlay.mandateRevokedFallback')}</p>

      {finalStats && (
        <div className={gameEndOverlayStyles['victory-stats-grid']}>
          <div className={gameEndOverlayStyles['stat-box']}>
            <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.timeElapsed')}</span>
            <span className={gameEndOverlayStyles['stat-value']}>{finalStats.time_taken}</span>
          </div>
          <div className={gameEndOverlayStyles['stat-box']}>
            <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.xpGranted')}</span>
            <span className={`${gameEndOverlayStyles['stat-value']} ${gameEndOverlayStyles['highlight']}`}>{awardedXp} <span className={gameEndOverlayStyles['stat-sub']}>/ {finalStats.max_xp}</span></span>
          </div>
          <div className={gameEndOverlayStyles['stat-box']}>
            <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.suspectsCaught')}</span>
            <span className={gameEndOverlayStyles['stat-value']}>{finalStats.suspects_caught} <span className={gameEndOverlayStyles['stat-sub']}>/ {finalStats.total_guilty}</span></span>
          </div>
          <div className={gameEndOverlayStyles['stat-box']}>
            <span className={gameEndOverlayStyles['stat-label']}>{t('pages.gameRoom.gameEndOverlay.innocentsAccused')}</span>
            <span className={`${gameEndOverlayStyles['stat-value']} ${finalStats.innocents_accused > 0 ? gameEndOverlayStyles['error'] : gameEndOverlayStyles['success']}`}>
              {finalStats.innocents_accused}
            </span>
          </div>
        </div>
      )}
    </PopupDialog>
  );
}
