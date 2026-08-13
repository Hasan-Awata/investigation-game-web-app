// FILE: src/context/RoomContext.tsx

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { GameRoom, Evidence, Suspect, Victim } from '../types';

// 1. Separate the State (Data that changes frequently)
interface RoomState {
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedSuspects: Suspect[];
  accumulatedVictims: Victim[];
  viewedEvidences: Set<number>;
  viewedSuspects: Set<number>;
  viewedVictims: Set<number>;
}

// 2. Separate the Actions (Functions that rarely/never change identity)
interface RoomActions {
  refreshRoomData: () => Promise<void>;
  markEvidenceAsViewed: (id: number) => void;
  markSuspectAsViewed: (id: number) => void;
  markVictimAsViewed: (id: number) => void;
  setGameOverData: (message: string, stats?: any) => void;
}

// 3. Create Two Distinct Contexts
const RoomStateContext = createContext<RoomState | undefined>(undefined);
const RoomActionContext = createContext<RoomActions | undefined>(undefined);

// 4. Provider Props (Kept identical so GameRoom.tsx doesn't need to change)
interface RoomProviderProps extends RoomState, RoomActions {
  children: ReactNode;
}

export function RoomProvider({ 
  children, 
  room, 
  accumulatedEvidences, 
  accumulatedSuspects,
  accumulatedVictims,
  viewedEvidences, 
  viewedSuspects,
  viewedVictims,
  refreshRoomData, 
  markEvidenceAsViewed,
  markSuspectAsViewed,
  markVictimAsViewed,
  setGameOverData 
}: RoomProviderProps) {
  
  // 5. Memoize the state. 
  // This object reference only changes when the actual underlying data changes.
  const state = useMemo<RoomState>(() => ({
    room,
    accumulatedEvidences,
    accumulatedSuspects,
    accumulatedVictims,
    viewedEvidences,
    viewedSuspects,
    viewedVictims
  }), [
    room, 
    accumulatedEvidences, 
    accumulatedSuspects, 
    accumulatedVictims, 
    viewedEvidences, 
    viewedSuspects, 
    viewedVictims
  ]);

  // 6. Memoize the actions. 
  // Because these functions are stable (or wrapped in useCallback higher up), 
  // this object reference will almost never change, saving us from massive re-renders.
  const actions = useMemo<RoomActions>(() => ({
    refreshRoomData,
    markEvidenceAsViewed,
    markSuspectAsViewed,
    markVictimAsViewed,
    setGameOverData
  }), [
    refreshRoomData, 
    markEvidenceAsViewed, 
    markSuspectAsViewed, 
    markVictimAsViewed, 
    setGameOverData
  ]);

  return (
    <RoomActionContext.Provider value={actions}>
      <RoomStateContext.Provider value={state}>
        {children}
      </RoomStateContext.Provider>
    </RoomActionContext.Provider>
  );
}

// 7. Expose Targeted Hooks
export function useRoomState() {
  const context = useContext(RoomStateContext);
  if (context === undefined) {
    throw new Error('useRoomState must be used within a RoomProvider');
  }
  return context;
}

export function useRoomActions() {
  const context = useContext(RoomActionContext);
  if (context === undefined) {
    throw new Error('useRoomActions must be used within a RoomProvider');
  }
  return context;
}