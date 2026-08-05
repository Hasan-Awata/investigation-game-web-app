import { createContext, useContext, type ReactNode } from 'react';
import type { GameRoom, Evidence, Suspect, Victim } from '../types';

interface RoomContextType {
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedSuspects: Suspect[];
  accumulatedVictims: Victim[];
  refreshRoomData: () => Promise<void>;
  
  viewedEvidences: Set<number>;
  markEvidenceAsViewed: (id: number) => void;
  
  viewedSuspects: Set<number>;
  markSuspectAsViewed: (id: number) => void;
  
  viewedVictims: Set<number>;
  markVictimAsViewed: (id: number) => void;

  setGameOverData: (message: string, stats?: any) => void;
}

interface RoomProviderProps extends Omit<RoomContextType, 'setGameOverData'> {
  children: ReactNode;
  setGameOverData: (message: string, stats?: any) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

interface RoomProviderProps {
  children: ReactNode;
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedSuspects: Suspect[];
  accumulatedVictims: Victim[];
  refreshRoomData: () => Promise<void>;
  viewedEvidences: Set<number>;
  markEvidenceAsViewed: (id: number) => void;
  viewedSuspects: Set<number>;
  markSuspectAsViewed: (id: number) => void;
  viewedVictims: Set<number>;
  markVictimAsViewed: (id: number) => void;
}

export function RoomProvider({ 
  children, 
  room, 
  accumulatedEvidences, 
  accumulatedSuspects,
  accumulatedVictims,
  refreshRoomData, 
  viewedEvidences, 
  markEvidenceAsViewed,
  viewedSuspects,
  markSuspectAsViewed,
  viewedVictims,
  markVictimAsViewed,
  setGameOverData 
}: RoomProviderProps) {
  return (
    <RoomContext.Provider value={{ 
      room, 
      accumulatedEvidences, 
      accumulatedSuspects, 
      accumulatedVictims,
      refreshRoomData, 
      viewedEvidences, 
      markEvidenceAsViewed,
      viewedSuspects,
      markSuspectAsViewed,
      viewedVictims,
      markVictimAsViewed,
      setGameOverData 
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return context;
}