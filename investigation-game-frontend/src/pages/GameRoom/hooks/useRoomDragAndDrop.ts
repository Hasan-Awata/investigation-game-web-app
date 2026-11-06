import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { getClientRect, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { ClientRect, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Character, Evidence } from '@/types';

export type CharacterSourcePool = 'unassigned' | 'guilty';
type RoomDragData =
  | { type: 'EVIDENCE'; sourcePool?: never }
  | { type: 'CHARACTER'; characterId: number; sourcePool?: CharacterSourcePool };

interface RoomDragAndDropOptions {
  accumulatedEvidences: Evidence[];
  accumulatedCharacters: Character[];
  sidebarRef: RefObject<HTMLElement | null>;
  isTrayVisible: boolean;
  showProceduralTray: () => void;
  addEvidenceToTray: (id: number) => void;
  addCharacterToTray: (id: number) => void;
  handleCharacterDrop: (id: number, pool: CharacterSourcePool) => void;
}

export function useRoomDragAndDrop({
  accumulatedEvidences,
  accumulatedCharacters,
  sidebarRef,
  isTrayVisible,
  showProceduralTray,
  addEvidenceToTray,
  addCharacterToTray,
  handleCharacterDrop,
}: RoomDragAndDropOptions) {
  const dragSourceRect = useRef<ClientRect | null>(null);
  const sidebarWatch = useRef<AbortController | null>(null);
  const pendingPointerWatch = useRef<AbortController | null>(null);
  const pendingPointerMove = useRef<PointerEvent | null>(null);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [activeDragType, setActiveDragType] = useState<RoomDragData['type'] | null>(null);
  const [activeDragSource, setActiveDragSource] = useState<CharacterSourcePool | null>(null);

  useEffect(() => () => {
    sidebarWatch.current?.abort();
    pendingPointerWatch.current?.abort();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const clearPendingPointer = () => {
    pendingPointerWatch.current?.abort();
    pendingPointerWatch.current = null;
    pendingPointerMove.current = null;
  };

  const clearDragState = () => {
    sidebarWatch.current?.abort();
    sidebarWatch.current = null;
    dragSourceRect.current = null;
    setActiveDragId(null);
    setActiveDragType(null);
    setActiveDragSource(null);
  };

  const trackPendingPointer = (event: ReactPointerEvent) => {
    const { target, pointerId, isPrimary, button } = event;
    if (isTrayVisible || !isPrimary || button !== 0 || !(target instanceof Element) ||
        !target.closest('[aria-roledescription="draggable"]')) return;

    clearPendingPointer();
    const watch = new AbortController();
    pendingPointerWatch.current = watch;
    const options = { capture: true, passive: true, signal: watch.signal };
    const document = target.ownerDocument;
    document.addEventListener('pointermove', (move) => {
      if (move.pointerId === pointerId) pendingPointerMove.current = move;
    }, options);
    const stop = (end: PointerEvent) => {
      if (end.pointerId === pointerId) clearPendingPointer();
    };
    document.addEventListener('pointerup', stop, options);
    document.addEventListener('pointercancel', stop, options);
  };

  const handleDragStart = (event: DragStartEvent) => {
    // The pointer movement that passes the sensor threshold can already be over the sidebar.
    const activationMove = pendingPointerMove.current;
    clearPendingPointer();
    const data = event.active.data.current as RoomDragData | undefined;

    setActiveDragType(data?.type || 'EVIDENCE');
    setActiveDragId(data?.type === 'CHARACTER' ? data.characterId : (event.active.id as number));
    setActiveDragSource(data?.sourcePool || null);

    const sidebar = sidebarRef.current;
    if (!sidebar || isTrayVisible || (data?.type !== 'EVIDENCE' && data?.type !== 'CHARACTER')) return;

    // Keep the original card position when revealing the tray reflows the workspace.
    const { activatorEvent } = event;
    const source = activatorEvent.target;
    const card = source instanceof Element ? source.closest<HTMLElement>('[aria-roledescription="draggable"]') : null;
    dragSourceRect.current = card ? getClientRect(card, { ignoreTransform: true }) : null;

    sidebarWatch.current?.abort();
    const watch = new AbortController();
    sidebarWatch.current = watch;
    const options = { capture: true, passive: true, signal: watch.signal };
    const revealAt = (x: number, y: number) => {
      const { left, right, top, bottom } = sidebar.getBoundingClientRect();
      if (x < left || x >= right || y < top || y >= bottom) return;
      watch.abort();
      showProceduralTray();
    };

    // Native move coordinates stay relative to the viewport even during auto-scroll.
    if (activatorEvent instanceof PointerEvent) {
      sidebar.ownerDocument.addEventListener('pointermove', (move) => {
        if (move.pointerId === activatorEvent.pointerId) revealAt(move.clientX, move.clientY);
      }, options);
      if (activationMove?.pointerId === activatorEvent.pointerId) {
        revealAt(activationMove.clientX, activationMove.clientY);
      }
    } else if (activatorEvent instanceof TouchEvent) {
      const touch = activatorEvent.changedTouches[0];
      if (!touch) return;
      sidebar.ownerDocument.addEventListener('touchmove', (move) => {
        const movedTouch = Array.from(move.changedTouches).find(({ identifier }) => identifier === touch.identifier);
        if (movedTouch) revealAt(movedTouch.clientX, movedTouch.clientY);
      }, options);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) {
      const data = active.data.current as RoomDragData | undefined;

      if (data?.type === 'EVIDENCE' && over.id === 'procedural-tray') {
        addEvidenceToTray(active.id as number);
      } else if (data?.type === 'CHARACTER') {
        if (over.id === 'procedural-tray') addCharacterToTray(data.characterId);
        if (over.id === 'guilty-zone') handleCharacterDrop(data.characterId, 'guilty');
        if (over.id === 'unassigned-zone') handleCharacterDrop(data.characterId, 'unassigned');
      }
    }

    clearDragState();
  };

  const activeEvidence = useMemo(
    () => activeDragType === 'EVIDENCE' ? accumulatedEvidences.find((ev) => ev.id === activeDragId) : null,
    [accumulatedEvidences, activeDragId, activeDragType]
  );
  const activeCharacter = useMemo(
    () => activeDragType === 'CHARACTER' ? accumulatedCharacters.find((character) => character.id === activeDragId) : null,
    [accumulatedCharacters, activeDragId, activeDragType]
  );

  const measureDraggable = (node: HTMLElement) => dragSourceRect.current ?? getClientRect(node, { ignoreTransform: true });

  return {
    trackPendingPointer,
    isDragging: activeDragId !== null,
    activeEvidence,
    activeCharacter,
    activeDragSource,
    contextProps: {
      sensors,
      measuring: { draggable: { measure: measureDraggable } },
      onDragAbort: clearPendingPointer,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragCancel: clearDragState,
    },
  };
}
