import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import '@/i18n';
import type { GameCase } from '../../../types';
import { CaseUserStatus } from '../../../types';
import { createRoom, restartRoom } from '../../../services/api';
import styles from './CaseBriefingModal.module.css';

interface CaseBriefingModalProps {
  gameCase: GameCase;
  onClose: () => void;
}

export default function CaseBriefingModal({ gameCase, onClose }: CaseBriefingModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const confirmationId = useId();
  const requestPending = useRef(false);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmingRestart) cancelButtonRef.current?.focus();
  }, [confirmingRestart]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !isLoading) {
      event.stopPropagation();
      if (confirmingRestart) {
        if (error) {
          onClose();
          return;
        }
        setConfirmingRestart(false);
        setError(null);
        primaryButtonRef.current?.focus();
        return;
      }
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
    if (!focusableElements?.length) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === first || activeElement === modalRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || activeElement === modalRef.current)) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleStartSession = async () => {
    if (requestPending.current) return;
    if (gameCase.active_room_invite_code && !confirmingRestart) {
      setConfirmingRestart(true);
      setError(null);
      return;
    }
    requestPending.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const result = gameCase.active_room_invite_code
        ? await restartRoom(gameCase.id, gameCase.active_room_invite_code)
        : await createRoom(gameCase.id);
      if (result.isSuccess) {
        if (gameCase.active_room_invite_code) {
          queryClient.removeQueries({ queryKey: ['gameRoom', gameCase.active_room_invite_code] });
        }
        if (!gameCase.active_room_invite_code) void queryClient.invalidateQueries({ queryKey: ['cases'] });
        navigate(`/room/${result.value.invite_code}`);
      } else {
        setError(gameCase.active_room_invite_code
          ? `${t('components.caseBriefing.restartFailed')} ${result.errorMessage}`
          : result.errorMessage);
      }
    } catch {
      setError(t(gameCase.active_room_invite_code ? 'components.caseBriefing.restartFailed' : 'components.caseBriefing.startFailed'));
    } finally {
      if (gameCase.active_room_invite_code) void queryClient.invalidateQueries({ queryKey: ['cases'] });
      requestPending.current = false;
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
  } else if (confirmingRestart) {
    primaryButtonText = t('components.caseBriefing.confirmRestart');
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
    <div className={styles.modalBackdrop} onClick={() => { if (!requestPending.current) onClose(); }}>
      <div
        ref={modalRef}
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} disabled={isLoading} title="Close" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>

        <div className={styles.modalScrollArea} tabIndex={0} role="region" aria-labelledby={titleId}>
          <div className={styles.heroHeader} style={heroStyle}>
            <div className={styles.heroGradientOverlay}></div>
            <div className={styles.heroContent}>
              <div className={styles.modalAuthor}>
                {t('components.caseBriefing.authoredBy')} {gameCase.author_name || t('components.caseBriefing.system')}
              </div>
              <h2 id={titleId} className={styles.modalTitle}>{gameCase.title}</h2>
              {gameCase.tags && gameCase.tags.length > 0 && (
                <div className={styles.dossierTags}>
                  {gameCase.tags.map((tag, idx) => (
                    <span key={idx} className={styles.dossierTagPill}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.metadataRow}>
              {/* Playtime */}
              <div className={styles.metadataItem}>
                <svg aria-hidden="true" className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{gameCase.estimated_playtime || t('components.caseBriefing.unknown')}</span>
              </div>

              {/* Difficulty */}
              <div className={styles.metadataItem}>
                <svg aria-hidden="true" className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>{gameCase.difficulty || t('components.caseBriefing.standard')}</span>
              </div>

              {/* Rating */}
              <div className={styles.metadataItem}>
                <svg aria-hidden="true" className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span>{gameCase.rating_stars ? `${gameCase.rating_stars} / 5` : t('components.caseBriefing.unrated')}</span>
              </div>

              {/* Advisory */}
              <div className={styles.metadataItem}>
                <svg aria-hidden="true" className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                <span>{gameCase.age_rating || t('components.caseBriefing.unrated')}</span>
              </div>

              {/* Access Requirements */}
              <div className={styles.metadataItem}>
                <svg aria-hidden="true" className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span className={styles.metaValueHighlightMono}>{gameCase.min_player_XP} {'XP'}</span>
              </div>

              {/* Reward */}
              <div className={`${styles.metadataItem} ${rewardClass}`}>
                <svg aria-hidden="true" className={styles.metadataIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V8H4v4"/><path d="M2 6h20v12H2z"/><path d="M12 12h.01"/><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
                </svg>
                <span className={styles.metaValueHighlightMono}>{rewardText}</span>
              </div>
            </div>

            <div className={styles.modalStoryContainer}>
              <p>{gameCase.story}</p>
            </div>

          </div>
        </div>

        <div className={styles.modalActions}>
          {confirmingRestart && (
            <p id={confirmationId} className={styles.restartExplanation} role="status">
              {t('components.caseBriefing.restartExplanation')}
            </p>
          )}
          {error && <div className={styles.modalErrorMessage} role="alert">{error}</div>}
          <button ref={primaryButtonRef} type="button" className={styles.btnPrimary} onClick={handleStartSession} disabled={isLoading} aria-busy={isLoading} aria-describedby={confirmingRestart ? confirmationId : undefined}>
            {primaryButtonText}
          </button>

          {confirmingRestart && (
            <button ref={cancelButtonRef} type="button" className={styles.btnSecondary} disabled={isLoading} onClick={() => {
              if (error) {
                onClose();
                return;
              }
              setConfirmingRestart(false);
              setError(null);
              primaryButtonRef.current?.focus();
            }}>
              {t(error ? 'components.caseBriefing.backToCases' : 'components.caseBriefing.cancelRestart')}
            </button>
          )}

          {showContinue && !confirmingRestart && (
            <button
              type="button"
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
  );
}
