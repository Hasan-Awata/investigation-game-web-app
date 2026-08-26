import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import type { GameCase } from '../../types';
import { CaseUserStatus } from '../../types';
import { createRoom } from '../../services/api';
import './CaseBriefingModal.css';

interface CaseBriefingModalProps {
  gameCase: GameCase;
  onClose: () => void;
}

export default function CaseBriefingModal({ gameCase, onClose }: CaseBriefingModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const isSolved = userStatus === CaseUserStatus.SolvedPerfect || userStatus === CaseUserStatus.SolvedPartial;
  const isFailed = userStatus === CaseUserStatus.FailedNoProof || userStatus === CaseUserStatus.FailedIncomplete || userStatus === CaseUserStatus.FailedStrikes;
  const isFinished = isSolved || isFailed;

  const activeInviteCode = gameCase.active_room_invite_code;

  const showContinue = !!activeInviteCode;

  let primaryButtonText = t('components.caseBriefing.startCase');
  if (isLoading) {
    primaryButtonText = t('components.caseBriefing.encrypting');
  } else if (activeInviteCode) {
    primaryButtonText = t('components.caseBriefing.restartCase');
  } else if (isFinished) {
    primaryButtonText = t('components.caseBriefing.replayCase');
  }

  let rewardText = `${gameCase.XP_on_solve} ${t('components.caseBriefing.xp')}`;
  let rewardColor = 'var(--accent-amber)';

  if (userStatus === CaseUserStatus.SolvedPerfect) {
    rewardText = `0 ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.perfectReplay')}`;
    rewardColor = 'var(--text-secondary)';
  } else if (userStatus === CaseUserStatus.SolvedPartial) {
    rewardText = `0 ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.partialReplay')}`;
    rewardColor = 'var(--text-secondary)';
  } else if (isFailed) {
    rewardText = `${Math.floor(gameCase.XP_on_solve / 2)} ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.penaltyAllowance')}`;
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
          <div className="modal-author">{t('components.caseBriefing.authoredBy')} {gameCase.author_name || t('components.caseBriefing.system')}</div>
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
              <span className="meta-label">{t('components.caseBriefing.playerRating')}</span>
              <div className="meta-value">{renderStars(gameCase.rating_stars || 0)} <span style={{fontSize: '0.8rem', marginLeft: '0.5rem'}}>({gameCase.rating_stars || 'N/A'})</span></div>
            </div>

            <div className="meta-block">
              <span className="meta-label">{t('components.caseBriefing.difficulty')}</span>
              <div className="meta-value" style={{ color: 'var(--accent-crimson)' }}>{gameCase.difficulty || t('components.caseBriefing.standard')}</div>
            </div>

            <div className="meta-block">
              <span className="meta-label">{t('components.caseBriefing.estPlaytime')}</span>
              <div className="meta-value">{gameCase.estimated_playtime || t('components.caseBriefing.unknown')}</div>
            </div>

            <div className="meta-block">
              <span className="meta-label">{t('components.caseBriefing.advisory')}</span>
              <div className="meta-value advisory-badge">{gameCase.age_rating || t('components.caseBriefing.unrated')}</div>
            </div>

            <div className="meta-block" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <span className="meta-label">{t('components.caseBriefing.accessRequirements')}</span>
              <div className="modal-badges" style={{ marginTop: '0.5rem', flexDirection: 'column' }}>
                <span className="badge">{t('components.caseBriefing.minXp')} {gameCase.min_player_XP}</span>
                <span className="badge reward" style={{ color: rewardColor, borderColor: rewardColor }}>
                  {t('components.caseBriefing.reward')} {rewardText}
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
              {t('components.caseBriefing.continueInvestigation')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}