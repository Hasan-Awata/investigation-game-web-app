import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoomState } from '@/context/RoomContext';
import { useInvestigationPhase } from '@/hooks/useInvestigationPhase';
import type { Level, Choice } from '@/types';
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

  // --- ZOOM & PAN STATE ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 }); // Tracks delta movement to prevent sticky edges
  
  // Ref to measure the image bounds against the screen
  const wrapperRef = useRef<HTMLDivElement>(null);

  const storageKeyBase = `inv_loc_state_${room.id}_${level.id}`;

  const [localFound, setLocalFound] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`${storageKeyBase}_found`) || '[]')); } catch { return new Set(); }
  });

  const [localDeadEnds, setLocalDeadEnds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`${storageKeyBase}_deadEnds`) || '[]')); } catch { return new Set(); }
  });

  const [activeBubbles, setActiveBubbles] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`${storageKeyBase}_bubbles`) || '[]')); } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(`${storageKeyBase}_found`, JSON.stringify([...localFound]));
  }, [localFound, storageKeyBase]);

  useEffect(() => {
    localStorage.setItem(`${storageKeyBase}_deadEnds`, JSON.stringify([...localDeadEnds]));
  }, [localDeadEnds, storageKeyBase]);

  useEffect(() => {
    localStorage.setItem(`${storageKeyBase}_bubbles`, JSON.stringify([...activeBubbles]));
  }, [activeBubbles, storageKeyBase]);

  const foundPoints = new Set([
    ...(room.inspections?.filter((i: any) => !i.is_dead_end).map((i: any) => i.choice_id) || []),
    ...localFound
  ]);
  const clickedDeadEnds = new Set([
    ...(room.inspections?.filter((i: any) => i.is_dead_end).map((i: any) => i.choice_id) || []),
    ...localDeadEnds
  ]);

  const inspectMutation = useMutation({
    mutationFn: async (choiceId: number) => {
      const result = await api.inspectLocation(room.id, choiceId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onMutate: async (choiceId) => {
      await queryClient.cancelQueries({ queryKey: ['gameRoom', room.invite_code] });
      const previousRoom = queryClient.getQueryData(['gameRoom', room.invite_code]);

      queryClient.setQueryData(['gameRoom', room.invite_code], (old: any) => {
        if (!old) return old;
        
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

    // Prevent click actions if the user was just trying to pan/drag the image
    if (isDragging) return;

    const isAlreadyDiscovered = foundPoints.has(choice.id) || clickedDeadEnds.has(choice.id) || room.votes?.some((v: any) => v.choice_id === choice.id);

    if (isAlreadyDiscovered) {
      setActiveBubbles(prev => {
        const next = new Set(prev);
        if (next.has(choice.id)) next.delete(choice.id);
        else next.add(choice.id);
        return next;
      });
      return; 
    }

    if (status !== 'active') return;

    const hasUnlocks = choice.outcomes && (
      (choice.outcomes.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) ||
      (choice.outcomes.unlock_levels && choice.outcomes.unlock_levels.length > 0) ||
      (choice.outcomes.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) ||
      (choice.outcomes.unlock_victims && choice.outcomes.unlock_victims.length > 0) ||
      (choice.outcomes.next_question_id)
    );

    const isCorrectFind = !!hasUnlocks;

    if (isCorrectFind) {
      setLocalFound(prev => new Set(prev).add(choice.id));
    } else {
      setLocalDeadEnds(prev => new Set(prev).add(choice.id));
    }

    setActiveBubbles(prev => new Set(prev).add(choice.id));
    inspectMutation.mutate(choice.id);

    if (isCorrectFind) {
      if (choice.outcomes?.next_question_id) {
        addToast({
          type: 'level',
          title: t('pages.gameRoom.campaign.levels.location.newSceneUnlocked'),
          message: t('pages.gameRoom.campaign.levels.location.newVantagePoint'),
          icon: 'https://api.iconify.design/ph:map-pin-line-duotone.svg?color=%235a8a9e'
        });
      }
      handleSelectChoice(e, qId, choice, status);
    }
  };

  const closeViewer = () => {
    setInspectingQuestionId(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // --- BOUNDARY CALCULATION ---
  const clampPosition = (targetX: number, targetY: number, currentScale: number) => {
    if (!wrapperRef.current) return { x: targetX, y: targetY };

    const { clientWidth, clientHeight } = wrapperRef.current;
    
    // Calculate the maximum allowed movement from the center
    const maxX = Math.max(0, (clientWidth * currentScale - window.innerWidth) / 2);
    const maxY = Math.max(0, (clientHeight * currentScale - window.innerHeight) / 2);

    return {
      x: Math.min(Math.max(targetX, -maxX), maxX),
      y: Math.min(Math.max(targetY, -maxY), maxY)
    };
  };

  // --- ZOOM & PAN EVENT HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.005;
    const delta = e.deltaY * -zoomSensitivity;
    const newScale = Math.min(Math.max(1, scale + delta), 5); // Clamped between 1x and 5x
    
    setScale(newScale);

    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    } else {
      // Clamp position in case zooming out forces the image out of bounds
      setPosition(prev => clampPosition(prev.x, prev.y, newScale));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      // Frame-by-frame delta movement
      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;
      
      const newX = position.x + deltaX;
      const newY = position.y + deltaY;

      // Ensure we don't drift past the black borders
      setPosition(clampPosition(newX, newY, scale));
      
      // Update last mouse position for the next frame
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const activeQuestion = displayQuestions.find(q => q.id === inspectingQuestionId);

  const fullScreenViewer = activeQuestion ? createPortal(
    <div className="location-fullscreen-overlay">
      <button 
        className="location-close-button" 
        onClick={closeViewer}
        title={t('pages.gameRoom.campaign.levels.location.closeViewer')}
      >
        ✕
      </button>

      <div 
        className="location-image-container"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'auto') }}
      >
        <div 
          ref={wrapperRef}
          className="location-image-wrapper"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <img src={activeQuestion.img_url || '/placeholder-crime-scene.jpg'} alt={t('pages.gameRoom.campaign.levels.location.crimeSceneAlt')} className="location-image-full" draggable="false" />

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
            const isCorrectFind = !!hasUnlocks;

            const isSelected = localVotes[activeQuestion.id] === choice.id || foundPoints.has(choice.id) || room.votes?.some((v: any) => v.choice_id === choice.id);
            const isDeadEndClicked = clickedDeadEnds.has(choice.id);
            const isNarrativeLocked = checkIsLockedByNarrative(choice);
            const isDiscovered = isSelected || isDeadEndClicked;

            let zoneClass = 'loc-hover-zone';
            if (isSelected) {
              zoneClass += ' selected';
            } else if (isDeadEndClicked || isNarrativeLocked) {
              zoneClass += ' investigated';
            }

            const isBubbleActive = activeBubbles.has(choice.id);
            const isInteractable = (status === 'active' && !isNarrativeLocked) || isDiscovered;
            const shouldRender = (status === 'active' && !isNarrativeLocked) || isDiscovered; 

            return (
              <div
                key={choice.id}
                className={zoneClass}
                style={{ 
                  top: `${y}%`, 
                  left: `${x}%`, 
                  cursor: isNarrativeLocked ? 'not-allowed' : (isInteractable ? 'pointer' : 'default'),
                  pointerEvents: shouldRender ? 'auto' : 'none',
                  display: shouldRender ? 'flex' : 'none'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (!isInteractable) return;
                  handlePointClick(e, activeQuestion.id, choice);
                }}
              >
                <div className="loc-crosshair"></div>
                
                {!isBubbleActive && (
                  <div className="loc-tooltip">
                    {isNarrativeLocked ? t('pages.gameRoom.campaign.levels.location.requiresIntel') : title}
                  </div>
                )}

                {isBubbleActive && (
                  <div className={`loc-info-bubble ${isCorrectFind ? 'success' : 'error'}`}>
                    {choice.outcomes?.feedback || (isCorrectFind ? t('pages.gameRoom.campaign.levels.location.foundUseful') : t('pages.gameRoom.campaign.levels.location.nothingFound'))}
                  </div>
                )}
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