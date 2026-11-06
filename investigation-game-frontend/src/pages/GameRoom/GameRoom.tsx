import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { RoomDataProvider, RoomUIProvider } from '@/context/RoomContext';
import type { ToastNotification, GlobalFeedback } from '@/context/RoomContext.shared';
import { useGameRoom } from '@/hooks/useGameRoom';
import { useViewedItems } from '@/hooks/useViewedItems';
import type { FinalStats } from '@/types';
import RoomEntryState from './components/RoomStatus/RoomEntryState';
import RoomSyncStatus from './components/RoomStatus/RoomSyncStatus';
import { useRoomRealtime } from './hooks/useRoomRealtime';
import GameRoomLayout from './GameRoomLayout';

export default function GameRoom() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const {
    room,
    isLoading,
    error,
    syncError,
    accessDenied,
    canRetry,
    retryRoom,
    isRecovering,
    accumulatedEvidences,
    accumulatedCharacters,
    refreshRoomData,
    patchRoomData
  } = useGameRoom(inviteCode);

  const { viewedItems: viewedEvidences, markItemAsViewed: markEvidenceAsViewed } = useViewedItems(room?.invite_code, 'evidence');
  const { viewedItems: viewedCharacters, markItemAsViewed: markCharacterAsViewed } = useViewedItems(room?.invite_code, 'characters');

  const [resolution, setResolution] = useState<{ inviteCode: string | undefined; message: string } | null>(null);
  const resolutionMessage = resolution?.inviteCode === inviteCode ? resolution?.message ?? null : null;
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [globalFeedback, setGlobalFeedback] = useState<GlobalFeedback | null>(null);

  const timeoutsRef = useRef(new Set<number>());

  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const pendingTimeouts = timeoutsRef.current;
    const id = window.setTimeout(() => {
      pendingTimeouts.delete(id);
      callback();
    }, delay);
    pendingTimeouts.add(id);
  }, []);

  const setGameOverData = useCallback((message: string, stats?: FinalStats) => {
    setResolution({ inviteCode, message });
    if (stats) patchRoomData(previous => ({ ...previous, final_stats: stats }));
  }, [inviteCode, patchRoomData]);

  const addGlobalToast = useCallback((toastData: Omit<ToastNotification, 'id'>) => {
    const newToast: ToastNotification = { ...toastData, id: crypto.randomUUID() };
    setToasts((prev) => [...prev, newToast]);
    scheduleTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== newToast.id)), 5000);
  }, [scheduleTimeout]);

  useEffect(() => {
    const pendingTimeouts = timeoutsRef.current;
    return () => {
      pendingTimeouts.forEach(id => window.clearTimeout(id));
      pendingTimeouts.clear();
    };
  }, []);

  useRoomRealtime({
    roomId: room?.id,
    patchRoomData,
    refreshRoomData,
    setGlobalFeedback,
    setGameOverData,
    addGlobalToast,
    scheduleTimeout,
  });

  if (accessDenied) return <RoomEntryState status="denied" message={accessDenied} />;
  if (isLoading) return <RoomEntryState status="loading" />;
  if (error || !room) return (
    <RoomEntryState status="unavailable" message={error} canRetry={canRetry} isRecovering={isRecovering} onRetry={retryRoom} />
  );

  return (
    <RoomDataProvider
      room={room}
      accumulatedEvidences={accumulatedEvidences}
      accumulatedCharacters={accumulatedCharacters}
      refreshRoomData={refreshRoomData}
    >
      {syncError && <RoomSyncStatus canRetry={canRetry} />}
      <RoomUIProvider
        viewedEvidences={viewedEvidences} markEvidenceAsViewed={markEvidenceAsViewed}
        viewedCharacters={viewedCharacters} markCharacterAsViewed={markCharacterAsViewed}
        setGameOverData={setGameOverData as (message: string, stats?: unknown) => void}
        addGlobalToast={addGlobalToast}
        globalFeedback={globalFeedback} setGlobalFeedback={setGlobalFeedback}
      >
        <GameRoomLayout resolutionMessage={resolutionMessage} finalStats={room.final_stats ?? null} toasts={toasts} />
      </RoomUIProvider>
    </RoomDataProvider>
  );
}
