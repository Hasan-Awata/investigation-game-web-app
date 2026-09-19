import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import type { GameCase } from '../../../types';
import { CaseUserStatus } from '../../../types';
import { createRoom } from '../../../services/api';
import styles from './CaseBriefingModal.module.css';

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

  let rewardText = `${gameCase.XP_on_solve} XP`;
  let rewardClass = styles.rewardStandard;

  if (userStatus === CaseUserStatus.SolvedPerfect) {
    rewardText = `0 ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.perfectReplay')}`;
    rewardClass = styles.rewardNeutral;
  } else if (userStatus === CaseUserStatus.SolvedPartial) {
    rewardText = `0 ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.partialReplay')}`;
    rewardClass = styles.rewardNeutral;
  } else if (isFailed) {
    rewardText = `${Math.floor(gameCase.XP_on_solve / 2)} ${t('components.caseBriefing.xp')} ${t('components.caseBriefing.penaltyAllowance')}`;
    rewardClass = styles.rewardPenalty;
  }

  const heroStyle = gameCase.img_url
    ? { backgroundImage: `url(${gameCase.img_url})` }
    : {};

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} disabled={isLoading} title="Close">✕</button>

        {/* Immersive Hero Header */}
        <div className={styles.heroHeader} style={heroStyle}>
          <div className={styles.heroGradientOverlay}></div>
          <div className={styles.heroContent}>
            <div className={styles.modalAuthor}>
              {t('components.caseBriefing.authoredBy')} {gameCase.author_name || t('components.caseBriefing.system')}
            </div>
            <h2 className={styles.modalTitle}>{gameCase.title}</h2>
            {gameCase.tags && gameCase.tags.length > 0 && (
              <div className={styles.dossierTags}>
                {gameCase.tags.map((tag, idx) => (
                  <span key={idx} className={styles.dossierTagPill}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          
          {/* Combined Horizontal Metadata Row without the box container */}
          <div className={styles.metadataRow}>
            {/* Playtime */}
            <div className={styles.metadataItem}>
              <svg className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{gameCase.estimated_playtime || t('components.caseBriefing.unknown')}</span>
            </div>

            {/* Difficulty */}
            <div className={styles.metadataItem}>
              <svg className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>{gameCase.difficulty || t('components.caseBriefing.standard')}</span>
            </div>

            {/* Rating */}
            <div className={styles.metadataItem}>
              <svg className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{gameCase.rating_stars ? `${gameCase.rating_stars} / 5` : t('components.caseBriefing.unrated')}</span>
            </div>

            {/* Advisory */}
            <div className={styles.metadataItem}>
              <svg className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
              <span>{gameCase.age_rating || t('components.caseBriefing.unrated')}</span>
            </div>

            {/* Access Requirements */}
            <div className={styles.metadataItem}>
              <svg className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span className={styles.metaValueHighlightMono}>{gameCase.min_player_XP} {'XP'}</span>
            </div>

            {/* Reward */}
            <div className={`${styles.metadataItem} ${rewardClass}`}>
              <svg className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V8H4v4"/><path d="M2 6h20v12H2z"/><path d="M12 12h.01"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              </svg>
              <span className={styles.metaValueHighlightMono}>{rewardText}</span>
            </div>
          </div>

          <div className={styles.modalStoryContainer}>
            <p>{gameCase.story}</p>
          </div>

          {error && <div className={styles.modalErrorMessage}>{error}</div>}

          {/* Action Deck with Pill CTAs */}
          <div className={styles.modalActions}>
            <button className={styles.btnPrimary} onClick={handleStartSession} disabled={isLoading}>
              {primaryButtonText}
            </button>

            {showContinue && (
              <button
                className={`${styles.btnSecondary} ${styles.continueBtn}`}
                onClick={() => navigate(`/room/${activeInviteCode}`)}
                disabled={isLoading}
              >
                {t('components.caseBriefing.continueInvestigation')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}