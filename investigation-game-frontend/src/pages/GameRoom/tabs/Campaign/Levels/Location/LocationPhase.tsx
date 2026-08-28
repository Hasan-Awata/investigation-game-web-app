import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Level, Choice } from '@/types';
// Assume api.inspectLocation is added mapping to POST /rooms/{room}/inspect
import * as api from '@/services/api'; 
import './LocationPhase.css';

interface LocationPhaseProps {
  level: Level;
  status: string;
  isHost: boolean;
  isSubmitting: boolean;
  handleSubmitTheory: (e: React.MouseEvent) => void;
}

export default function LocationPhase({ level, status, isHost, isSubmitting, handleSubmitTheory }: LocationPhaseProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { room, accumulatedEvidences } = useRoomState();
  const { localVotes, handleSelectChoice, addToast } = useInvestigationPhase();

  const storedUser = localStorage.getItem('auth_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const currentUserId = currentUser?.id;

  const checkIsLockedByNarrative = (choice: Choice) => {
    if (!choice.requirements) return false;
    const reqs = choice.requirements;

    if (reqs.required_evidence?.length > 0) {
      const hasAllEvidence = reqs.required_evidence.every((id: number) =>
        accumulatedEvidences.some(e => e.id === id)
      );
      if (!hasAllEvidence) return true;
    }

    if (reqs.required_choices?.length > 0) {
      const hasAllChoices = reqs.required_choices.every((id: number) =>
        room.votes?.some(v => v.choice_id === id)
      );
      if (!hasAllChoices) return true;
    }

    return false;
  };

  const [inspectingQuestionId, setInspectingQuestionId] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ title: string; message: string; isSuccess: boolean } | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, []);

  // DERIVE STATE FROM AUTHORITATIVE BACKEND INSTEAD OF SESSION STORAGE
  const foundPoints = new Set(room.inspections?.filter((i: any) => !i.is_dead_end).map((i: any) => i.choice_id) || []);
  const clickedDeadEnds = new Set(room.inspections?.filter((i: any) => i.is_dead_end).map((i: any) => i.choice_id) || []);

  // OPTIMISTIC MUTATION
  const inspectMutation = useMutation({
    mutationFn: async (choiceId: number) => {
      const result = await api.inspectLocation(room.id, choiceId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onMutate: async (choiceId) => {
      await queryClient.cancelQueries({ queryKey: ['gameRoom', room.invite_code] });
      const previousRoom = queryClient.getQueryData(['gameRoom', room.invite_code]);

      // Optimistically patch the cache
      queryClient.setQueryData(['gameRoom', room.invite_code], (old: any) => {
        if (!old) return old;
        
        // Find choice to determine dead-end status locally for the instant UX snapshot
        let isCorrectFind = false;
        level.questions?.forEach(q => {
          const c = q.choices?.find(x => x.id === choiceId);
          if (c) {
            isCorrectFind = !!(c.outcomes?.next_question_id || c.outcomes?.unlock_evidence?.length || c.outcomes?.unlock_levels?.length || c.outcomes?.unlock_suspects?.length || c.outcomes?.unlock_victims?.length);
          }
        });

        return {
          ...old,
          inspections: [...(old.inspections || []), { choice_id: choiceId, is_dead_end: !isCorrectFind }]
        };
      });

      return { previousRoom };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['gameRoom', room.invite_code], context?.previousRoom);
    }
  });

  if (!level.questions) return null;

  const isCompleted = status === 'completed';
  const visibleQuestionIds = new Set<number>();

  const lockedBehindChoiceIds = new Set<number>();
  level.questions.forEach(q => {
    q.choices?.forEach(c => {
      if (c.outcomes?.next_question_id) {
        lockedBehindChoiceIds.add(Number(c.outcomes.next_question_id));
      }
    });
  });

  level.questions.forEach(q => {
    if (!lockedBehindChoiceIds.has(q.id)) {
      visibleQuestionIds.add(q.id);
    }
  });

  level.questions.forEach(q => {
    q.choices?.forEach(c => {
      const isSelectedLocally = foundPoints.has(c.id) || localVotes[q.id] === c.id;
      const isSelectedGlobally = room.votes?.some(v => v.choice_id === c.id);

      if (isSelectedLocally || isSelectedGlobally) {
        if (c.outcomes?.next_question_id) {
          visibleQuestionIds.add(Number(c.outcomes.next_question_id));
        }
      }
    });
  });

  const displayQuestions = isCompleted
    ? level.questions
    : level.questions.filter(q =>
        visibleQuestionIds.has(q.id) &&
        (q.assigned_user_id === currentUserId ||
         q.assigned_user_id === undefined ||
         q.assigned_user_id === null)
      );

  const handlePointClick = (e: React.MouseEvent, qId: number, choice: Choice) => {
    e.stopPropagation();
    if (status !== 'active') return;

    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);

    const hasUnlocks = choice.outcomes && (
      (choice.outcomes.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) ||
      (choice.outcomes.unlock_levels && choice.outcomes.unlock_levels.length > 0) ||
      (choice.outcomes.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) ||
      (choice.outcomes.unlock_victims && choice.outcomes.unlock_victims.length > 0) ||
      (choice.outcomes.next_question_id)
    );

    const isCorrectFind = !!hasUnlocks;
    const isFirstTimeDiscovery = !foundPoints.has(choice.id);

    // Fire the optimistic TanStack mutation to the server
    if (isFirstTimeDiscovery && !clickedDeadEnds.has(choice.id)) {
        inspectMutation.mutate(choice.id);
    }

    if (isCorrectFind) {
      setPopup({
        title: t('pages.gameRoom.campaign.levels.location.leadDiscovered'),
        message: choice.outcomes?.feedback || t('pages.gameRoom.campaign.levels.location.foundUseful'),
        isSuccess: true
      });

      if (isFirstTimeDiscovery && choice.outcomes?.next_question_id) {
        addToast({
          type: 'level',
          title: t('pages.gameRoom.campaign.levels.location.newSceneUnlocked'),
          message: t('pages.gameRoom.campaign.levels.location.newVantagePoint'),
          icon: 'https://api.iconify.design/ph:map-pin-line-duotone.svg?color=%235a8a9e'
        });
      }

      if (isFirstTimeDiscovery) {
        handleSelectChoice(e, qId, choice, status);
      }
    } else {
        setPopup({
          title: t('pages.gameRoom.campaign.levels.location.deadEnd'),
          message: choice.outcomes?.feedback || t('pages.gameRoom.campaign.levels.location.nothingFound'),
          isSuccess: false
        });
    }

    popupTimeoutRef.current = setTimeout(() => {
      setPopup(null);
    }, 2500);
  };

  const activeQuestion = displayQuestions.find(q => q.id === inspectingQuestionId);

  const fullScreenViewer = activeQuestion ? createPortal(
    <div className="location-fullscreen-overlay">
      <div className="location-header glass-panel">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            {activeQuestion.text || level.title}
          </h2>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('pages.gameRoom.campaign.levels.location.activeSceneSweep')}</span>
        </div>
        <button className="btn-secondary" style={{ flex: 'none', padding: '0.5rem 1.5rem' }} onClick={() => setInspectingQuestionId(null)}>
          {t('pages.gameRoom.campaign.levels.location.closeViewer')}
        </button>
      </div>

      <div className="location-image-container">
        {popup && (
          <div className={`loc-feedback-modal ${popup.isSuccess ? 'success' : 'error'}`}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: popup.isSuccess ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
              {popup.title}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-primary)' }}>{popup.message}</p>
          </div>
        )}

        <div className="location-image-wrapper">
          <img src={activeQuestion.img_url || '/placeholder-crime-scene.jpg'} alt={t('pages.gameRoom.campaign.levels.location.crimeSceneAlt')} className="location-image-full" />

          {activeQuestion.choices?.map(choice => {
            const parts = choice.text.split('|');
            if (parts.length < 2) return null;

            const coords = parts[0].trim();
            const title = parts[1].trim();

            const coordParts = coords.split(',');
            if (coordParts.length < 2) return null;

            const x = coordParts[0].trim();
            const y = coordParts[1].trim();

            const hasUnlocks = choice.outcomes && (
              (choice.outcomes.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) ||
              (choice.outcomes.unlock_levels && choice.outcomes.unlock_levels.length > 0) ||
              (choice.outcomes.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) ||
              (choice.outcomes.unlock_victims && choice.outcomes.unlock_victims.length > 0) ||
              (choice.outcomes.next_question_id)
            );

            const isSelected = localVotes[activeQuestion.id] === choice.id || foundPoints.has(choice.id) || (isCompleted && !!hasUnlocks);
            const isDeadEndClicked = clickedDeadEnds.has(choice.id);
            const isNarrativeLocked = checkIsLockedByNarrative(choice);

            let zoneClass = 'loc-hover-zone';
            if (isSelected) {
              zoneClass += ' selected';
            } else if (isCompleted || isDeadEndClicked || isNarrativeLocked) {
              zoneClass += ' investigated';
            }

            return (
              <div
                key={choice.id}
                className={zoneClass}
                style={{ top: `${y}%`, left: `${x}%`, cursor: isNarrativeLocked ? 'not-allowed' : 'crosshair' }}
                onClick={(e) => {
                  if (isNarrativeLocked) return;
                  handlePointClick(e, activeQuestion.id, choice);
                }}
              >
                <div className="loc-crosshair"></div>
                <div className="loc-tooltip">
                  {isNarrativeLocked ? t('pages.gameRoom.campaign.levels.location.requiresIntel') : title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const hasGlobalInteraction = level.questions?.some(q => room.votes?.some((v: any) => v.question_id === q.id));
  const hasInteracted = foundPoints.size > 0 || clickedDeadEnds.size > 0 || hasGlobalInteraction;

  return (
    <div className="location-phase-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {displayQuestions.map(q => (
        <div key={q.id} className="location-thumbnail-container">
          <div className="location-thumbnail" style={{ backgroundImage: `url(${q.img_url || '/placeholder-crime-scene.jpg'})` }}>
            <div className="thumbnail-overlay">
              <button
                className="btn-primary"
                onClick={() => setInspectingQuestionId(q.id)}
                style={{ flex: 'none', width: 'auto', padding: '0.75rem 2rem', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
              >
                <span style={{ marginInlineEnd: '0.5rem'}}>👁️</span> {t('pages.gameRoom.campaign.levels.location.inspectLocation')}
              </button>
            </div>
          </div>
          <p className="location-hint">{q.text || t('pages.gameRoom.campaign.levels.location.enterViewerHint')}</p>
        </div>
      ))}

      {status === 'active' && (
        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          {isHost ? (
            <button
              className="btn-primary"
              disabled={!hasInteracted || isSubmitting}
              onClick={handleSubmitTheory}
              style={{ padding: '1rem 3rem', width: 'auto' }}
            >
              {isSubmitting ? t('pages.gameRoom.campaign.levels.location.processing') : t('pages.gameRoom.campaign.levels.location.leaveLocation')}
            </button>
          ) : (
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}>
              {t('pages.gameRoom.campaign.levels.location.awaitingHost')}
            </div>
          )}
        </div>
      )}

      {fullScreenViewer}
    </div>
  );
}