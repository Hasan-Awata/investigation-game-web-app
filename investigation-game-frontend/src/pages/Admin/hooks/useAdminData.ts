import { useQuery } from '@tanstack/react-query';
import { fetchAdminCases, fetchAdminPhases, fetchAdminLevels } from '@/services/adminApi';
import type { GameCase, Phase, Level } from '@/types';

// 1. Fetch Top-Level Cases
export function useAdminCases() {
  return useQuery<GameCase[]>({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
  });
}

// 2. Fetch Phases (Only triggers when a Case is selected)
export function useAdminPhases(caseId: string) {
  return useQuery<Phase[]>({
    queryKey: ['adminPhases', caseId],
    queryFn: async () => {
      const result = await fetchAdminPhases(caseId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    enabled: !!caseId, // TanStack Query Guard: Prevents execution until caseId exists
  });
}

// 3. Fetch Levels & Nodes (Only triggers when a Phase is selected)
export function useAdminLevels(phaseId: string) {
  return useQuery<Level[]>({
    queryKey: ['adminLevels', phaseId],
    queryFn: async () => {
      const result = await fetchAdminLevels(phaseId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    enabled: !!phaseId, // TanStack Query Guard: Prevents execution until phaseId exists
  });
}