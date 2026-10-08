import { createContext, useContext } from 'react';
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

export interface RoomDataState {
  room: GameRoom;
  accumulatedEvidences: Evidence[];
  accumulatedCharacters: Character[];
  refreshRoomData: () => Promise<void>;
}

export interface RoomUIState {
  viewedEvidences: Set<number>;
  viewedCharacters: Set<number>;
  globalFeedback: GlobalFeedback | null;
  markEvidenceAsViewed: (id: number) => void;
  markCharacterAsViewed: (id: number) => void;
  setGameOverData: (message: string, stats?: unknown) => void;
  addGlobalToast: (toast: Omit<ToastNotification, 'id'>) => void;
  setGlobalFeedback: (feedback: GlobalFeedback | null) => void;
}

const RoomDataContext = createContext<RoomDataState | undefined>(undefined);
const RoomUIContext = createContext<RoomUIState | undefined>(undefined);

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

export { RoomDataContext, RoomUIContext };