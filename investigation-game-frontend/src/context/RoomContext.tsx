import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { GameRoom, Evidence, Character } from '../types';

export interface ToastNotification {
  id: string;
  type: 'evidence' | 'level' | 'character' | 'system';
  title: string;
  message: string;
  icon: string;
}

export interface GlobalFeedback {
  type: 'success' | 'error';
  title: string;
  message: string;
}

// 1. DATA CONTEXT: Domain entities that change slowly
export interface RoomDataState {
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedCharacters: Character[];
  refreshRoomData: () => Promise<void>;
}

// 2. UI CONTEXT: Interface states that are highly volatile
export interface RoomUIState {
  viewedEvidences: Set<number>;
  viewedCharacters: Set<number>;
  globalFeedback: GlobalFeedback | null;
  markEvidenceAsViewed: (id: number) => void;
  markCharacterAsViewed: (id: number) => void;
  setGameOverData: (message: string, stats?: any) => void;
  addGlobalToast: (toast: Omit<ToastNotification, 'id'>) => void;
  setGlobalFeedback: (feedback: GlobalFeedback | null) => void;
}

const RoomDataContext = createContext<RoomDataState | undefined>(undefined);
const RoomUIContext = createContext<RoomUIState | undefined>(undefined);

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

export function useRoomData() {
  const context = useContext(RoomDataContext);
  if (context === undefined) throw new Error('useRoomData must be used within a RoomDataProvider');
  return context;
}

export function useRoomUI() {
  const context = useContext(RoomUIContext);
  if (context === undefined) throw new Error('useRoomUI must be used within a RoomUIProvider');
  return context;
}

// --- LEGACY ADAPTER HOOKS (Ensures un-refactored tabs don't break during migration) ---
export function useRoomState() {
  const data = useContext(RoomDataContext);
  const ui = useContext(RoomUIContext);

  if (!data || !ui) throw new Error('useRoomState must be used within Room Providers');

  return {
    room: data.room,
    accumulatedEvidences: data.accumulatedEvidences,
    accumulatedCharacters: data.accumulatedCharacters,
    viewedEvidences: ui.viewedEvidences,
    viewedCharacters: ui.viewedCharacters,
    globalFeedback: ui.globalFeedback
  };
}

export function useRoomActions() {
  const data = useContext(RoomDataContext);
  const ui = useContext(RoomUIContext);

  if (!data || !ui) throw new Error('useRoomActions must be used within Room Providers');

  return {
    refreshRoomData: data.refreshRoomData,
    markEvidenceAsViewed: ui.markEvidenceAsViewed,
    markCharacterAsViewed: ui.markCharacterAsViewed,
    setGameOverData: ui.setGameOverData,
    addGlobalToast: ui.addGlobalToast,
    setGlobalFeedback: ui.setGlobalFeedback
  };
}