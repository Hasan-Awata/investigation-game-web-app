import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import type { GameCase, Phase, Level } from '@/types';

interface AdminContextState {
  caseId: string;
  phaseId: string;
  levelId: string;
  setCaseId: (id: string) => void;
  setPhaseId: (id: string) => void;
  setLevelId: (id: string) => void;

  cases: GameCase[];
  selectedCase: GameCase | undefined;
  availablePhases: Phase[];
  selectedPhase: Phase | undefined;
  availableLevels: Level[];
  selectedLevel: Level | undefined;

  isLoading: boolean;
  error: Error | null;
}

const AdminContext = createContext<AdminContextState | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { data: cases = [], isLoading, error } = useAdminData();

  const [caseId, setCaseId] = useState<string>('');
  const [phaseId, setPhaseId] = useState<string>('');
  const [levelId, setLevelId] = useState<string>('');

  // Cascading state handlers memoized to maintain stable reference equality
  const handleSetCaseId = useCallback((id: string) => {
    setCaseId(id);
    setPhaseId('');
    setLevelId('');
  }, []);

  const handleSetPhaseId = useCallback((id: string) => {
    setPhaseId(id);
    setLevelId('');
  }, []);

  // Derived Data (Memoized to prevent unnecessary recalculations)
  const selectedCase = useMemo(() => cases.find(c => c.id.toString() === caseId), [cases, caseId]);
  const availablePhases = useMemo(() => selectedCase?.phases || [], [selectedCase]);
  const selectedPhase = useMemo(() => availablePhases.find(p => p.id.toString() === phaseId), [availablePhases, phaseId]);
  const availableLevels = useMemo(() => selectedPhase?.levels || [], [selectedPhase]);
  const selectedLevel = useMemo(() => availableLevels.find(l => l.id.toString() === levelId), [availableLevels, levelId]);

  // The Provider value is strictly memoized. 
  // It will ONLY trigger consumer re-renders when a dependency genuinely updates.
  const value = useMemo(() => ({
    caseId,
    phaseId,
    levelId,
    setCaseId: handleSetCaseId,
    setPhaseId: handleSetPhaseId,
    setLevelId,
    cases,
    selectedCase,
    availablePhases,
    selectedPhase,
    availableLevels,
    selectedLevel,
    isLoading,
    error: error as Error | null
  }), [
    caseId,
    phaseId,
    levelId,
    handleSetCaseId,
    handleSetPhaseId,
    cases,
    selectedCase,
    availablePhases,
    selectedPhase,
    availableLevels,
    selectedLevel,
    isLoading,
    error
  ]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
}