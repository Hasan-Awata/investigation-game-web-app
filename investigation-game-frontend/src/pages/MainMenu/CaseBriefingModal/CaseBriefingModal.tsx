import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import '@/i18n';
import type { GameCase, User } from '../../../types';
import { getSafeStorage, removeSafeStorage, setSafeStorage } from '@/utils/storage';
import { CaseUserStatus } from '../../../types';
import { createRoom, restartRoom } from '../../../services/api';
import styles from './CaseBriefingModal.module.css';
import CaseRating from '../CaseMetadataBadge/CaseRating';
import CaseMetadataBadge from '../CaseMetadataBadge/CaseMetadataBadge';
import type { RewardState } from '../CaseMetadataBadge/CaseMetadataBadge';

interface CaseBriefingModalProps {
  gameCase: GameCase;
  userId?: User['id'];
  onClose: () => void;
}

export default function CaseBriefingModal({ gameCase, userId, onClose }: CaseBriefingModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favoriteKey = `case_favorite:${userId ?? 'local'}:${gameCase.id}`;
  const [isFavorite, setIsFavorite] = useState(() => getSafeStorage<boolean>('local', favoriteKey, false) === true);
  const [shareFeedback, setShareFeedback] = useState<'copied' | 'manual' | null>(null);
  const [showShareFeedback, setShowShareFeedback] = useState(false);
  const shareUrl = new URL('/', window.location.origin);
  shareUrl.searchParams.set('case', String(gameCase.id));
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const confirmationId = useId();
  const requestPending = useRef(false);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const toggleFavorite = () => {
    if (isFavorite) removeSafeStorage('local', favoriteKey);
    else setSafeStorage('local', favoriteKey, true);
    setIsFavorite(!isFavorite);
  };

  const shareCase = async () => {
    setShowShareFeedback(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: gameCase.title, url: shareUrl.href });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl.href);
      setShareFeedback('copied');
    } catch {
      setShareFeedback('manual');
    }
    setShowShareFeedback(true);
  };

  useEffect(() => {
    if (!showShareFeedback || shareFeedback !== 'copied') return;
    const timeout = window.setTimeout(() => setShowShareFeedback(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [shareFeedback, showShareFeedback]);

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

  const requestClose = () => {
    const backdrop = backdropRef.current;
    if (!backdrop || requestPending.current || backdrop.hasAttribute('data-closing')) return;

    backdrop.setAttribute('data-closing', '');
    const animations = backdrop.getAnimations?.() ?? [];
    if (!animations.length) {
      onClose();
      return;
    }

    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (backdrop.isConnected) onClose();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (requestPending.current || backdropRef.current?.hasAttribute('data-closing')) return;
      if (confirmingRestart) {
        if (error) {
          requestClose();
          return;
        }
        setConfirmingRestart(false);
        setError(null);
        primaryButtonRef.current?.focus();
        return;
      }
      requestClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]:not([inert] *)');
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

  const rewardState: RewardState = isSolved ? 'neutral' : isFailed ? 'penalty' : 'standard';

  const heroStyle = gameCase.img_url
    ? { backgroundImage: `url(${gameCase.img_url})` }
    : {};

  return (
    <div
      ref={backdropRef}
      className={styles.modalBackdrop}
      onClick={requestClose}
      onClickCapture={event => {
        if (!event.currentTarget.hasAttribute('data-closing')) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
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
        <div className={styles.heroActions}>
          <button type="button" className={`${styles.heroButton} ${styles.closeBtn}`} onClick={requestClose} disabled={isLoading} title="Close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
          <div className={styles.shareAction}>
            <button type="button" className={`${styles.heroButton} ${styles.shareBtn}`} onClick={shareCase} disabled={isLoading} title={t('components.caseBriefing.share')} aria-label={t('components.caseBriefing.share')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="m8.7 10.5 6.6-3.8m-6.6 6.8 6.6 3.8" />
                <circle cx="6" cy="12" r="3" /><circle cx="18" cy="5" r="3" /><circle cx="18" cy="19" r="3" />
              </svg>
            </button>
            <div className={styles.shareFeedback} role="status" inert={!showShareFeedback} aria-hidden={!showShareFeedback} data-copied={(showShareFeedback && shareFeedback === 'copied') || undefined}>
              {shareFeedback && t(shareFeedback === 'manual' ? 'components.caseBriefing.copyCaseLink' : 'components.caseBriefing.linkCopied')}
              {shareFeedback === 'manual' && <input readOnly tabIndex={0} aria-label={t('components.caseBriefing.copyCaseLink')} value={shareUrl.href} onFocus={event => event.currentTarget.select()} />}
            </div>
          </div>
          <button type="button" className={`${styles.heroButton} ${styles.favoriteBtn}`} onClick={toggleFavorite} disabled={isLoading} title={t('components.caseBriefing.favorite')} aria-label={t('components.caseBriefing.favorite')} aria-pressed={isFavorite}>
            <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.8 5.8a5.3 5.3 0 0 0-7.5 0L12 7.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5l1.3 1.3L12 22l7.5-7.4 1.3-1.3a5.3 5.3 0 0 0 0-7.5Z" />
            </svg>
          </button>
        </div>

        <div className={styles.modalScrollArea} tabIndex={0} role="region" aria-labelledby={titleId}>
          <div className={styles.heroHeader} style={heroStyle}>
            <div className={styles.heroGradientOverlay}></div>
            <div className={styles.heroContent}>
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
              <CaseMetadataBadge kind="author">
                {gameCase.author_name || t('components.caseBriefing.system')}
              </CaseMetadataBadge>
              <CaseMetadataBadge kind="playtime">{gameCase.estimated_playtime || t('components.caseBriefing.unknown')}</CaseMetadataBadge>
              <CaseMetadataBadge kind="difficulty">{gameCase.difficulty || t('components.caseBriefing.standard')}</CaseMetadataBadge>
              <CaseRating rating={gameCase.rating_stars} />
              <CaseMetadataBadge kind="advisory">{gameCase.age_rating || t('components.caseBriefing.unrated')}</CaseMetadataBadge>
              <CaseMetadataBadge kind="reward" rewardState={rewardState}>{gameCase.XP_on_solve}</CaseMetadataBadge>
              <CaseMetadataBadge kind="price">{t('components.caseBriefing.freePrice')}</CaseMetadataBadge>
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
                requestClose();
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
