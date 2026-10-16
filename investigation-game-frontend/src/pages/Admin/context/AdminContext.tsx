import { useEffect } from 'react';
import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { useAdminCases, useAdminZones, useAdminLevels } from '@/pages/Admin/hooks/useAdminData';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { useConfirm } from '@/pages/Admin/components/AdminUI/ConfirmContext';
import { AdminContext } from './AdminContext.shared';

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const { adminT } = useAdminTranslation();
  const t = adminT.context.adminContext;
  const confirm = useConfirm();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const [caseId, setCaseId] = useState<string>('');
  const [zoneId, setZoneId] = useState<string>('');
  const [levelId, setLevelId] = useState<string>('');

  const { data: cases = [], isLoading: isCasesLoading, error: casesError } = useAdminCases();
  const { data: availableZones = [], isLoading: isZonesLoading, error: zonesError } = useAdminZones(caseId);
  const { data: availableLevels = [], isLoading: isLevelsLoading, error: levelsError } = useAdminLevels(zoneId);

  const handleSetCaseId = useCallback(async (id: string) => {
    if (isDirty && !(await confirm({ message: t.switchCaseConfirm, danger: true }))) return;
    setIsDirty(false);
    setCaseId(id);
    setZoneId('');
    setLevelId('');
  }, [isDirty, t, confirm]);

  const handleSetZoneId = useCallback(async (id: string) => {
    if (isDirty && !(await confirm({ message: t.switchZoneConfirm, danger: true }))) return;
    setIsDirty(false);
    setZoneId(id);
    setLevelId('');
  }, [isDirty, t, confirm]);

  const handleSetLevelId = useCallback(async (id: string) => {
    if (isDirty && !(await confirm({ message: t.switchLevelConfirm, danger: true }))) return;
    setIsDirty(false);
    setLevelId(id);
  }, [isDirty, t, confirm]);

  const selectedCase = useMemo(() => cases.find(c => c.id.toString() === caseId), [cases, caseId]);
  const selectedZone = useMemo(() => availableZones.find(z => z.id.toString() === zoneId), [availableZones, zoneId]);
  const selectedLevel = useMemo(() => availableLevels.find(l => l.id.toString() === levelId), [availableLevels, levelId]);

  const isLoading = isCasesLoading || isZonesLoading || isLevelsLoading;
  const error = (casesError || zonesError || levelsError) as Error | null;

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