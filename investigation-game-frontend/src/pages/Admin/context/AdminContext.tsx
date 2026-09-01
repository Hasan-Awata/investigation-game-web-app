import { useEffect } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { useAdminCases, useAdminPhases, useAdminLevels } from '@/pages/Admin/hooks/useAdminData';
import type { GameCase, Phase, Level } from '@/types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

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
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
}

const AdminContext = createContext<AdminContextState | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const { adminT } = useAdminTranslation();
  const t = adminT.context.adminContext;

  // Browser-level protection against accidental tab closure/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required by modern browsers to trigger the warning
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Local state for dropdown selections
  const [caseId, setCaseId] = useState<string>('');
  const [phaseId, setPhaseId] = useState<string>('');
  const [levelId, setLevelId] = useState<string>('');

  // Granular Data Fetching
  const { data: cases = [], isLoading: isCasesLoading, error: casesError } = useAdminCases();
  const { data: availablePhases = [], isLoading: isPhasesLoading, error: phasesError } = useAdminPhases(caseId);
  const { data: availableLevels = [], isLoading: isLevelsLoading, error: levelsError } = useAdminLevels(phaseId);

  // Cascading state handlers memoized to maintain stable reference equality
  const handleSetCaseId = useCallback((id: string) => {
    if (isDirty && !window.confirm(t.switchCaseConfirm)) return;
    setIsDirty(false);
    setCaseId(id);
    setPhaseId('');
    setLevelId('');
  }, [isDirty, t]);

  const handleSetPhaseId = useCallback((id: string) => {
    if (isDirty && !window.confirm(t.switchPhaseConfirm)) return;
    setIsDirty(false);
    setPhaseId(id);
    setLevelId('');
  }, [isDirty, t]);

  const handleSetLevelId = useCallback((id: string) => {
    if (isDirty && !window.confirm(t.switchLevelConfirm)) return;
    setIsDirty(false);
    setLevelId(id);
  }, [isDirty, t]);

  // Derived Data (Memoized to prevent unnecessary recalculations)
  const selectedCase = useMemo(() => cases.find(c => c.id.toString() === caseId), [cases, caseId]);
  const selectedPhase = useMemo(() => availablePhases.find(p => p.id.toString() === phaseId), [availablePhases, phaseId]);
  const selectedLevel = useMemo(() => availableLevels.find(l => l.id.toString() === levelId), [availableLevels, levelId]);

  // Aggregate loading and error states
  const isLoading = isCasesLoading || isPhasesLoading || isLevelsLoading;
  const error = (casesError || phasesError || levelsError) as Error | null;

  // The Provider value is strictly memoized.
  // It will ONLY trigger consumer re-renders when a dependency genuinely updates.
  const value = useMemo(() => ({
    caseId,
    phaseId,
    levelId,
    setCaseId: handleSetCaseId,
    setPhaseId: handleSetPhaseId,
    setLevelId: handleSetLevelId,
    cases,
    selectedCase,
    availablePhases,
    selectedPhase,
    availableLevels,
    selectedLevel,
    isLoading,
    error,
    isDirty,
    setIsDirty
  }), [
    caseId,
    phaseId,
    levelId,
    handleSetCaseId,
    handleSetPhaseId,
    handleSetLevelId,
    cases,
    selectedCase,
    availablePhases,
    selectedPhase,
    availableLevels,
    selectedLevel,
    isLoading,
    error,
    isDirty,
    setIsDirty
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