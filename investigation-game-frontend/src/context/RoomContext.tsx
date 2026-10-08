import { useMemo, type ReactNode } from 'react';
import type { RoomDataState, RoomUIState } from './RoomContext.shared';
import {
  RoomDataContext,
  RoomUIContext,
  type ToastNotification,
  type GlobalFeedback
} from './RoomContext.shared';

export function RoomDataProvider({
  children, room, accumulatedEvidences, accumulatedCharacters, refreshRoomData
}: RoomDataState & { children: ReactNode }) {
  const value = useMemo(() => ({
    room, accumulatedEvidences, accumulatedCharacters, refreshRoomData
  }), [room, accumulatedEvidences, accumulatedCharacters, refreshRoomData]);

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>;
}

export function RoomUIProvider({
  children, viewedEvidences, viewedCharacters, globalFeedback,
  markEvidenceAsViewed, markCharacterAsViewed,
  setGameOverData, addGlobalToast, setGlobalFeedback
}: RoomUIState & { children: ReactNode }) {
  const value = useMemo(() => ({
    viewedEvidences, viewedCharacters, globalFeedback,
    markEvidenceAsViewed, markCharacterAsViewed,
    setGameOverData, addGlobalToast, setGlobalFeedback
  }), [viewedEvidences, viewedCharacters, globalFeedback, markEvidenceAsViewed, markCharacterAsViewed, setGameOverData, addGlobalToast, setGlobalFeedback]);

  return <RoomUIContext.Provider value={value}>{children}</RoomUIContext.Provider>;
}

export type { ToastNotification, GlobalFeedback };