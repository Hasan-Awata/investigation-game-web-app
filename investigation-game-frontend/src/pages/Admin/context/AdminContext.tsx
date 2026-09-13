import { useEffect } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { useAdminCases, useAdminZones, useAdminLevels } from '@/pages/Admin/hooks/useAdminData';
import type { GameCase, Zone, Level } from '@/types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

interface AdminContextState {
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
  const [zoneId, setZoneId] = useState<string>('');
  const [levelId, setLevelId] = useState<string>('');

  // Granular Data Fetching
  const { data: cases = [], isLoading: isCasesLoading, error: casesError } = useAdminCases();
  const { data: availableZones = [], isLoading: isZonesLoading, error: zonesError } = useAdminZones(caseId);
  const { data: availableLevels = [], isLoading: isLevelsLoading, error: levelsError } = useAdminLevels(zoneId);

  // Cascading state handlers memoized to maintain stable reference equality
  const handleSetCaseId = useCallback((id: string) => {
    if (isDirty && !window.confirm(t.switchCaseConfirm)) return;
    setIsDirty(false);
    setCaseId(id);
    setZoneId('');
    setLevelId('');
  }, [isDirty, t]);

  const handleSetZoneId = useCallback((id: string) => {
    if (isDirty && !window.confirm(t.switchZoneConfirm)) return;
    setIsDirty(false);
    setZoneId(id);
    setLevelId('');
  }, [isDirty, t]);

  const handleSetLevelId = useCallback((id: string) => {
    if (isDirty && !window.confirm(t.switchLevelConfirm)) return;
    setIsDirty(false);
    setLevelId(id);
  }, [isDirty, t]);

  // Derived Data (Memoized to prevent unnecessary recalculations)
  const selectedCase = useMemo(() => cases.find(c => c.id.toString() === caseId), [cases, caseId]);
  const selectedZone = useMemo(() => availableZones.find(z => z.id.toString() === zoneId), [availableZones, zoneId]);
  const selectedLevel = useMemo(() => availableLevels.find(l => l.id.toString() === levelId), [availableLevels, levelId]);

  // Aggregate loading and error states
  const isLoading = isCasesLoading || isZonesLoading || isLevelsLoading;
  const error = (casesError || zonesError || levelsError) as Error | null;

  // The Provider value is strictly memoized.
  // It will ONLY trigger consumer re-renders when a dependency genuinely updates.
  const value = useMemo(() => ({
    caseId,
    zoneId,
    levelId,
    setCaseId: handleSetCaseId,
    setZoneId: handleSetZoneId,
    setLevelId: handleSetLevelId,
    cases,
    selectedCase,
    availableZones,
    selectedZone,
    availableLevels,
    selectedLevel,
    isLoading,
    error,
    isDirty,
    setIsDirty
  }), [
    caseId,
    zoneId,
    levelId,
    handleSetCaseId,
    handleSetZoneId,
    handleSetLevelId,
    cases,
    selectedCase,
    availableZones,
    selectedZone,
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