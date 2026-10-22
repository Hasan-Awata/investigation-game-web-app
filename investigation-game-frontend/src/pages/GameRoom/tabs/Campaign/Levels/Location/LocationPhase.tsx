import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getLocalUser } from '@/utils/userState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoomData } from '@/context/RoomContext.shared';
import { getSafeStorage, setSafeStorage, getLocationStateKey, pruneStaleLocationState } from '@/utils/storage';
import type { Level, Choice, RoomInspection, GameRoom } from '@/types';
import * as api from '@/services/api'; 
import { checkIsLockedByNarrative } from '@/utils/narrativeLocks';
import locationPhase from './LocationPhase.module.css';

interface LocationPhaseProps { level: Level; }

export default function LocationPhase({ level }: LocationPhaseProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { room, accumulatedEvidences, refreshRoomData } = useRoomData();

  const [inspectingQuestionId, setInspectingQuestionId] = useState<number | null>(null);

  // --- ZOOM & PAN STATE ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Bounded cleanup: sweep keys written under older location-state schemas
  // once per mount so per-level keys never accumulate across sessions.
  useEffect(() => {
    pruneStaleLocationState();
  }, []);

  const [activeBubbles, setActiveBubbles] = useState<Set<number>>(() => {
    return new Set(getSafeStorage<number[]>('local', getLocationStateKey(room.id, level.id, 'bubbles'), []));
  });

  useEffect(() => {
    setSafeStorage('local', getLocationStateKey(room.id, level.id, 'bubbles'), Array.from(activeBubbles));
  }, [activeBubbles, room.id, level.id]);

  const clickedDeadEnds = new Set([
    ...(room.inspections?.filter((i: RoomInspection) => i.is_dead_end).map((i: RoomInspection) => i.choice_id) || [])
  ]);

  const inspectMutation = useMutation({
    mutationFn: async (choiceId: number) => {
      const result = await api.inspectLocation(room.id, choiceId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    // Replace the optimistic guess (and any broadcast copy) with the
    // authoritative server record, keyed by choice_id so it never duplicates.
    onSuccess: (data, choiceId) => {
      // Guaranteed fallback: if the response body is missing `inspection`,
      // refetch the room instead of silently losing the inspection state.
      if (!data?.inspection) {
        refreshRoomData();
        return;
      }
      queryClient.setQueryData(['gameRoom', room.invite_code], (old: GameRoom | undefined) => {
        if (!old) return old;
        const others = (old.inspections || []).filter((i: RoomInspection) => i.choice_id !== choiceId);
        return { ...old, inspections: [...others, data.inspection] };
      });
    }
  });

  if (!level.questions) return null;

  const visibleQuestionIds = new Set<number>();

  const lockedBehindChoiceIds = new Set<number>();
  level.questions.forEach(q => {
    q.choices?.forEach(c => {
      const nextId = c.next_question_id ?? c.outcomes?.next_question_id;
      if (nextId) {
        lockedBehindChoiceIds.add(Number(nextId));
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
      const isInspected = room.inspections?.some(inspection => inspection.choice_id === c.id && !inspection.is_dead_end);
      if (isInspected) {
        const nextId = c.next_question_id ?? c.outcomes?.next_question_id;
        if (nextId) {
          visibleQuestionIds.add(Number(nextId));
        }
      }
    });
  });

  const displayQuestions = level.questions.filter(q => visibleQuestionIds.has(q.id));

  const handlePointClick = (e: React.MouseEvent, choice: Choice) => {
    e.stopPropagation();

    if (isDragging) return;

    const isAlreadyDiscovered = room.inspections?.some((inspection: RoomInspection) => inspection.choice_id === choice.id);

    if (isAlreadyDiscovered) {
      setActiveBubbles(prev => {
        const next = new Set(prev);
        if (next.has(choice.id)) next.delete(choice.id);
        else next.add(choice.id);
        return next;
      });
      return; 
    }

    setActiveBubbles(prev => new Set(prev).add(choice.id));
    inspectMutation.mutate(choice.id);
  };

  const closeViewer = () => {
    setInspectingQuestionId(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const clampPosition = (targetX: number, targetY: number, currentScale: number) => {
    if (!wrapperRef.current) return { x: targetX, y: targetY };

    const { clientWidth, clientHeight } = wrapperRef.current;
    
    const maxX = Math.max(0, (clientWidth * currentScale - window.innerWidth) / 2);
    const maxY = Math.max(0, (clientHeight * currentScale - window.innerHeight) / 2);

    return {
      x: Math.min(Math.max(targetX, -maxX), maxX),
      y: Math.min(Math.max(targetY, -maxY), maxY)
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.005;
    const delta = e.deltaY * -zoomSensitivity;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    
    setScale(newScale);

    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    } else {
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
      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;
      
      const newX = position.x + deltaX;
      const newY = position.y + deltaY;

      setPosition(clampPosition(newX, newY, scale));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const activeQuestion = displayQuestions.find(q => q.id === inspectingQuestionId);

  const fullScreenViewer = activeQuestion ? createPortal(
    <div className={locationPhase['location-fullscreen-overlay']}>
      <button 
        className={locationPhase['location-close-button']} 
        onClick={closeViewer}
        title={t('pages.gameRoom.campaign.levels.location.closeViewer')}
      >
        ✕
      </button>

      <div 
        className={locationPhase['location-image-container']}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'auto') }}
      >
        <div 
          ref={wrapperRef}
          className={locationPhase['location-image-wrapper']}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <img src={activeQuestion.img_url || '/placeholder-crime-scene.jpg'} alt={t('pages.gameRoom.campaign.levels.location.crimeSceneAlt')} className={locationPhase['location-image-full']} draggable="false" />

          {activeQuestion.choices?.map(choice => {
            const parts = choice.text.split('|');
            if (parts.length < 2) return null;

            const coords = parts[0].trim();
            const title = parts[1].trim();
            const coordParts = coords.split(',');
            if (coordParts.length < 2) return null;

            const x = coordParts[0].trim();
            const y = coordParts[1].trim();

            const inspection = room.inspections?.find((item: RoomInspection) => item.choice_id === choice.id);
            const correctFind = !!inspection && !inspection.is_dead_end;
            const isSelected = !!inspection;
            const isDeadEndClicked = clickedDeadEnds.has(choice.id);
            
            // STRICT FILTER CHECK
            const ownVotes = room.votes?.filter(vote => vote.user_id === getLocalUser()?.id) ?? [];
            const isNarrativeLocked = checkIsLockedByNarrative(choice, accumulatedEvidences, ownVotes);
            const isDiscovered = isSelected || isDeadEndClicked;

            let zoneClass = locationPhase['loc-hover-zone'];
            if (isSelected) {
              zoneClass += ` ${locationPhase['selected']}`;
            } else if (isDeadEndClicked || isNarrativeLocked) {
              zoneClass += ` ${locationPhase['investigated']}`;
            }

            const isBubbleActive = activeBubbles.has(choice.id);
            
            // If the element does not meet evidence prerequisites, it completely vanishes
            const isInteractable = !isNarrativeLocked || isDiscovered;
            const isAvailable = room.available_location_point_ids?.includes(choice.id) ?? true;
            const shouldRender = isAvailable && (!isNarrativeLocked || isDiscovered);

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
                  handlePointClick(e, choice);
                }}
              >
                <div className={locationPhase['loc-crosshair']}></div>
                
                {!isBubbleActive && (
                  <div className={locationPhase['loc-tooltip']}>
                    {isNarrativeLocked ? t('pages.gameRoom.campaign.levels.location.requiresIntel') : title}
                  </div>
                )}

{isBubbleActive && (
                  <div 
                    className={`${locationPhase['loc-info-bubble']} ${correctFind ? locationPhase['success'] : locationPhase['error']}`}>
                    {correctFind ? t('pages.gameRoom.campaign.levels.location.foundUseful') : t('pages.gameRoom.campaign.levels.location.nothingFound')}
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

  return (
    <div className="location-phase-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {displayQuestions.map(q => (
        <div key={q.id} className={locationPhase['location-thumbnail-container']}>
          <div className={locationPhase['location-thumbnail']} style={{ backgroundImage: `url(${q.img_url || '/placeholder-crime-scene.jpg'})` }}>
            <div className={locationPhase['thumbnail-overlay']}>
              <button
                className="btn-primary"
                onClick={() => setInspectingQuestionId(q.id)}
                style={{ flex: 'none', width: 'auto', padding: '0.75rem 2rem', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
              >
                <span style={{ marginInlineEnd: '0.5rem'}}>👁️</span> {t('pages.gameRoom.campaign.levels.location.inspectLocation')}
              </button>
            </div>
          </div>
          <p className={locationPhase['location-hint']}>{q.text || t('pages.gameRoom.campaign.levels.location.enterViewerHint')}</p>
        </div>
      ))}

      {fullScreenViewer}
    </div>
  );
}
