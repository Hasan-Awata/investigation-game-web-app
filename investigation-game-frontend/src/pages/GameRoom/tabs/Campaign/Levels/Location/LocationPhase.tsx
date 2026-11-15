import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getLocalUser } from '@/utils/userState';
import { useQueryClient } from '@tanstack/react-query';
import { useGameMutation } from '@/hooks/useGameMutation';
import { useRoomData } from '@/context/RoomContext.shared';
import { getSafeStorage, setSafeStorage, getLocationStateKey, pruneStaleLocationState } from '@/utils/storage';
import type { Level, Choice, RoomInspection, GameRoom } from '@/types';
import * as api from '@/services/api';
import { checkIsLockedByNarrative } from '@/utils/narrativeLocks';
import locationPhase from './LocationPhase.module.css';
import { getOpenLocationQuestions } from '@/utils/locationProgress';

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
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const keyPrefix = 'pages.gameRoom.campaign.levels.location.';

  useEffect(() => {
    if (inspectingQuestionId === null) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [inspectingQuestionId]);

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

  const inspectMutation = useGameMutation({
    mutationFn: (choiceId: number) => api.inspectLocation(room.id, choiceId),
    // Replace the optimistic guess (and any broadcast copy) with the
    // authoritative server record, keyed by choice_id so it never duplicates.
    onSuccess: (data, choiceId) => {
      setActiveBubbles(prev => new Set(prev).add(choiceId));
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

  const displayQuestions = getOpenLocationQuestions(level.questions ?? [], room.inspections ?? []);

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

    if (inspectMutation.isPending) return;
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

    const maxX = Math.max(0, (clientWidth * currentScale - (stageRef.current?.clientWidth ?? clientWidth)) / 2);
    const maxY = Math.max(0, (clientHeight * currentScale - (stageRef.current?.clientHeight ?? clientHeight)) / 2);

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

  const handleMouseDown = (e: React.PointerEvent) => {
    if (scale > 1 && e.button === 0) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.PointerEvent) => {
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

  const updateScale = (value: number) => {
    const next = Math.min(5, Math.max(1, value));
    setScale(next);
    setPosition(previous => next === 1 ? { x: 0, y: 0 } : clampPosition(previous.x, previous.y, next));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.stopPropagation(); closeViewer(); return; }
    if (event.key === 'Tab') {
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (scale <= 1 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    setPosition(previous => clampPosition(
      previous.x + (event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0),
      previous.y + (event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0), scale));
  };

  const activeQuestion = displayQuestions.find(q => q.id === inspectingQuestionId);

  const fullScreenViewer = activeQuestion ? createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t(keyPrefix + 'inspectLocation')}
      className={locationPhase['location-fullscreen-overlay']} onKeyDown={handleKeyDown}>
      <header className={locationPhase.toolbar}>
        <div className={locationPhase['zoom-controls']}>
          {(['zoomOut', 'zoomIn', 'resetZoom'] as const).map(action => (
            <button key={action} type="button" className={locationPhase['viewer-control']}
              aria-label={t(keyPrefix + action)} title={t(keyPrefix + action)}
              disabled={action === 'zoomIn' ? scale >= 5 : scale <= 1}
              onClick={() => updateScale(action === 'resetZoom' ? 1 : scale + (action === 'zoomIn' ? 0.5 : -0.5))}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                {action === 'resetZoom' ? <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/> : <><path d="M5 12h14"/>{action === 'zoomIn' && <path d="M12 5v14"/>}</>}
              </svg>
            </button>
          ))}
          <output className={locationPhase['zoom-value']}>{Math.round(scale * 100)}%</output>
        </div>
      <button
        ref={closeRef} type="button" className={`${locationPhase['viewer-control']} ${locationPhase['exit-control']}`}
        onClick={closeViewer}
        title={t('pages.gameRoom.campaign.levels.location.closeViewer')}
        aria-label={t('pages.gameRoom.campaign.levels.location.closeViewer')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>
      </button>
      </header>

      <div ref={stageRef}
        className={locationPhase['location-image-container']}
        onWheel={handleWheel}
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        onPointerCancel={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'auto') }}
      >
        <div
          ref={wrapperRef}
          className={locationPhase['location-image-wrapper']}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            '--image-scale': scale
          } as React.CSSProperties}
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
            if (correctFind) {
              zoneClass += ` ${locationPhase['selected']}`;
            } else if (isDeadEndClicked || isNarrativeLocked) {
              zoneClass += ` ${locationPhase['investigated']}`;
            }

            const isBubbleActive = isDiscovered && activeBubbles.has(choice.id);

            // If the element does not meet evidence prerequisites, it completely vanishes
            const isInteractable = !isNarrativeLocked || isDiscovered;
            const isAvailable = room.available_location_point_ids?.includes(choice.id) ?? true;
            const shouldRender = isAvailable && (!isNarrativeLocked || isDiscovered);

            if (!shouldRender) return null;
            return (
              <button type="button" aria-label={title} aria-expanded={isBubbleActive}
                data-edge={Number(x) < 25 ? 'left' : Number(x) > 75 ? 'right' : undefined} data-top={Number(y) < 25}
                disabled={inspectMutation.isPending && !isDiscovered} aria-busy={inspectMutation.isPending && !isDiscovered}
                key={choice.id}
                className={zoneClass}
                style={{
                  top: `${y}%`,
                  left: `${x}%`,
                  cursor: isNarrativeLocked ? 'not-allowed' : (isInteractable ? 'pointer' : 'default'),
                  pointerEvents: shouldRender ? 'auto' : 'none',
                  display: shouldRender ? 'flex' : 'none'
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (!isInteractable) return;
                  handlePointClick(e, choice);
                }}
              >
                <span aria-hidden="true" className={locationPhase['loc-crosshair']}></span>

                {!isBubbleActive && (
                  <span className={locationPhase['loc-tooltip']}>
                    {isNarrativeLocked ? t('pages.gameRoom.campaign.levels.location.requiresIntel') : title}
                  </span>
                )}

{isBubbleActive && (
                  <span role="status"
                    className={`${locationPhase['loc-info-bubble']} ${correctFind ? locationPhase['success'] : locationPhase['error']}`}>
                    {correctFind ? t('pages.gameRoom.campaign.levels.location.foundUseful') : t('pages.gameRoom.campaign.levels.location.nothingFound')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={locationPhase['location-phase-wrapper']}>
      {displayQuestions.length === 0 && <p className={locationPhase['location-hint']}>{t(keyPrefix + 'emptyScenes')}</p>}
      {displayQuestions.map(q => (
        <div key={q.id} className={locationPhase['location-thumbnail-container']}>
          <button type="button" className={locationPhase['location-thumbnail']}
            aria-describedby={`scene-hint-${level.id}-${q.id}`}
            style={{ backgroundImage: `url(${q.img_url || '/placeholder-crime-scene.jpg'})` }}
            onClick={() => setInspectingQuestionId(q.id)}>
            <span className={locationPhase['thumbnail-overlay']}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              {t(keyPrefix + 'inspectLocation')}
            </span>
          </button>
          <p id={`scene-hint-${level.id}-${q.id}`} className={locationPhase['location-hint']}>{q.text || t(keyPrefix + 'enterViewerHint')}</p>
        </div>
      ))}

      {fullScreenViewer}
    </div>
  );
}
