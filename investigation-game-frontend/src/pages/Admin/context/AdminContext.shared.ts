import { createContext, useContext } from 'react';
import type { GameCase, Zone, Level } from '@/types';

export interface AdminContextState {
  caseId: string;
  zoneId: string;
  levelId: string;
  setCaseId: (id: string) => void;
  setZoneId: (id: string) => void;
  setLevelId: (id: string) => void;

  cases: GameCase[];
  selectedCase: GameCase | undefined;
  availableZones: Zone[];
  selectedZone: Zone | undefined;
  availableLevels: Level[];
  selectedLevel: Level | undefined;

  isLoading: boolean;
  error: Error | null;
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
}

const AdminContext = createContext<AdminContextState | undefined>(undefined);

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
}

export { AdminContext };