import { createContext, useContext, type ReactNode } from 'react';
import type { GameRoom, Evidence } from '../types';

interface RoomContextType {
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  refreshRoomData: () => Promise<void>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

interface RoomProviderProps {
  children: ReactNode;
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  refreshRoomData: () => Promise<void>;
}

export function RoomProvider({ children, room, accumulatedEvidences, refreshRoomData }: RoomProviderProps) {
  return (
    <RoomContext.Provider value={{ room, accumulatedEvidences, refreshRoomData }}>
      {children}
    </RoomContext.Provider>
  );
}

// Custom hook for consuming the context safely
export function useRoomContext() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return context;
}