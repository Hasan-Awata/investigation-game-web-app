import { createContext, useContext, type ReactNode } from 'react';
import type { GameRoom, Evidence, Suspect } from '../types';

interface RoomContextType {
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedSuspects: Suspect[];
  refreshRoomData: () => Promise<void>;
  
  viewedEvidences: Set<number>;
  markEvidenceAsViewed: (id: number) => void;
  
  viewedSuspects: Set<number>;
  markSuspectAsViewed: (id: number) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

interface RoomProviderProps {
  children: ReactNode;
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedSuspects: Suspect[];
  refreshRoomData: () => Promise<void>;
  viewedEvidences: Set<number>;
  markEvidenceAsViewed: (id: number) => void;
  viewedSuspects: Set<number>;
  markSuspectAsViewed: (id: number) => void;
}

export function RoomProvider({ 
  children, 
  room, 
  accumulatedEvidences, 
  accumulatedSuspects,
  refreshRoomData, 
  viewedEvidences, 
  markEvidenceAsViewed,
  viewedSuspects,
  markSuspectAsViewed
}: RoomProviderProps) {
  return (
    <RoomContext.Provider value={{ 
      room, 
      accumulatedEvidences, 
      accumulatedSuspects, 
      refreshRoomData, 
      viewedEvidences, 
      markEvidenceAsViewed,
      viewedSuspects,
      markSuspectAsViewed
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