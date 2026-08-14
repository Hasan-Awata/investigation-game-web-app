// FILE: src/context/RoomContext.tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { GameRoom, Evidence, Suspect, Victim } from '../types';

export interface ToastNotification {
  id: string;
  type: 'evidence' | 'level' | 'suspect' | 'victim' | 'system';
  title: string;
  message: string;
  icon: string;
}

// 1. Define the Global Feedback Type
export interface GlobalFeedback {
  type: 'success' | 'error';
  title: string;
  message: string;
}

interface RoomState {
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedSuspects: Suspect[];
  accumulatedVictims: Victim[];
  viewedEvidences: Set<number>;
  viewedSuspects: Set<number>;
  viewedVictims: Set<number>;
  globalFeedback: GlobalFeedback | null; // Added
}

interface RoomActions {
  refreshRoomData: () => Promise<void>;
  markEvidenceAsViewed: (id: number) => void;
  markSuspectAsViewed: (id: number) => void;
  markVictimAsViewed: (id: number) => void;
  setGameOverData: (message: string, stats?: any) => void;
  addGlobalToast: (toast: Omit<ToastNotification, 'id'>) => void; 
  setGlobalFeedback: (feedback: GlobalFeedback | null) => void; // Added
}

const RoomStateContext = createContext<RoomState | undefined>(undefined);
const RoomActionContext = createContext<RoomActions | undefined>(undefined);

interface RoomProviderProps extends RoomState, RoomActions {
  children: ReactNode;
}

export function RoomProvider({ 
  children, room, accumulatedEvidences, accumulatedSuspects, accumulatedVictims,
  viewedEvidences, viewedSuspects, viewedVictims, globalFeedback, 
  refreshRoomData, markEvidenceAsViewed, markSuspectAsViewed, markVictimAsViewed,
  setGameOverData, addGlobalToast, setGlobalFeedback 
}: RoomProviderProps) {
  
  const state = useMemo<RoomState>(() => ({
    room, accumulatedEvidences, accumulatedSuspects, accumulatedVictims,
    viewedEvidences, viewedSuspects, viewedVictims, globalFeedback
  }), [room, accumulatedEvidences, accumulatedSuspects, accumulatedVictims, viewedEvidences, viewedSuspects, viewedVictims, globalFeedback]);

  const actions = useMemo<RoomActions>(() => ({
    refreshRoomData, markEvidenceAsViewed, markSuspectAsViewed, markVictimAsViewed, setGameOverData, addGlobalToast, setGlobalFeedback
  }), [refreshRoomData, markEvidenceAsViewed, markSuspectAsViewed, markVictimAsViewed, setGameOverData, addGlobalToast, setGlobalFeedback]);

  return (
    <RoomActionContext.Provider value={actions}>
      <RoomStateContext.Provider value={state}>
        {children}
      </RoomStateContext.Provider>
    </RoomActionContext.Provider>
  );
}

export function useRoomState() {
  const context = useContext(RoomStateContext);
  if (context === undefined) throw new Error('useRoomState must be used within a RoomProvider');
  return context;
}

export function useRoomActions() {
  const context = useContext(RoomActionContext);
  if (context === undefined) throw new Error('useRoomActions must be used within a RoomProvider');
  return context;
}