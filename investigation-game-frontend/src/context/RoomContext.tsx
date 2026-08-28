import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { GameRoom, Evidence, Suspect, Victim } from '../types';

export interface ToastNotification {
  id: string;
  type: 'evidence' | 'level' | 'suspect' | 'victim' | 'system';
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
  accumulatedSuspects: Suspect[];
  accumulatedVictims: Victim[];
  refreshRoomData: () => Promise<void>;
}

// 2. UI CONTEXT: Interface states that are highly volatile
export interface RoomUIState {
  viewedEvidences: Set<number>;
  viewedSuspects: Set<number>;
  viewedVictims: Set<number>;
  globalFeedback: GlobalFeedback | null;
  markEvidenceAsViewed: (id: number) => void;
  markSuspectAsViewed: (id: number) => void;
  markVictimAsViewed: (id: number) => void;
  setGameOverData: (message: string, stats?: any) => void;
  addGlobalToast: (toast: Omit<ToastNotification, 'id'>) => void;
  setGlobalFeedback: (feedback: GlobalFeedback | null) => void;
}

const RoomDataContext = createContext<RoomDataState | undefined>(undefined);
const RoomUIContext = createContext<RoomUIState | undefined>(undefined);

export function RoomDataProvider({
  children, room, accumulatedEvidences, accumulatedSuspects, accumulatedVictims, refreshRoomData
}: RoomDataState & { children: ReactNode }) {
  const value = useMemo(() => ({
    room, accumulatedEvidences, accumulatedSuspects, accumulatedVictims, refreshRoomData
  }), [room, accumulatedEvidences, accumulatedSuspects, accumulatedVictims, refreshRoomData]);

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>;
}

export function RoomUIProvider({
  children, viewedEvidences, viewedSuspects, viewedVictims, globalFeedback,
  markEvidenceAsViewed, markSuspectAsViewed, markVictimAsViewed,
  setGameOverData, addGlobalToast, setGlobalFeedback
}: RoomUIState & { children: ReactNode }) {
  const value = useMemo(() => ({
    viewedEvidences, viewedSuspects, viewedVictims, globalFeedback,
    markEvidenceAsViewed, markSuspectAsViewed, markVictimAsViewed,
    setGameOverData, addGlobalToast, setGlobalFeedback
  }), [viewedEvidences, viewedSuspects, viewedVictims, globalFeedback, markEvidenceAsViewed, markSuspectAsViewed, markVictimAsViewed, setGameOverData, addGlobalToast, setGlobalFeedback]);

  return <RoomUIContext.Provider value={value}>{children}</RoomUIContext.Provider>;
}

// --- NEW ARCHITECTURE HOOKS ---

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

// --- LEGACY ADAPTER HOOKS (Ensures un-refactored tabs don't break) ---

export function useRoomState() {
  const data = useContext(RoomDataContext);
  const ui = useContext(RoomUIContext);
  
  if (!data || !ui) throw new Error('useRoomState must be used within Room Providers');
  
  return {
    room: data.room,
    accumulatedEvidences: data.accumulatedEvidences,
    accumulatedSuspects: data.accumulatedSuspects,
    accumulatedVictims: data.accumulatedVictims,
    viewedEvidences: ui.viewedEvidences,
    viewedSuspects: ui.viewedSuspects,
    viewedVictims: ui.viewedVictims,
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
    markSuspectAsViewed: ui.markSuspectAsViewed,
    markVictimAsViewed: ui.markVictimAsViewed,
    setGameOverData: ui.setGameOverData,
    addGlobalToast: ui.addGlobalToast,
    setGlobalFeedback: ui.setGlobalFeedback
  };
}