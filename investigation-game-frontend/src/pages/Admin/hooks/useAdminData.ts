import { useQuery } from '@tanstack/react-query';
import { fetchAdminCases, fetchAdminZones, fetchAdminLevels } from '@/services/adminApi';
import type { GameCase, Zone, Level } from '@/types';

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

// 2. Fetch zones (Only triggers when a Case is selected)
export function useAdminZones(caseId: string) {
  return useQuery<Zone[]>({
    queryKey: ['adminZones', caseId],
    queryFn: async () => {
      const result = await fetchAdminZones(caseId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    enabled: !!caseId, // TanStack Query Guard: Prevents execution until caseId exists
  });
}

// 3. Fetch Levels & Nodes (Only triggers when a Zone is selected)
export function useAdminLevels(zoneId: string) {
  return useQuery<Level[]>({
    queryKey: ['adminLevels', zoneId],
    queryFn: async () => {
      const result = await fetchAdminLevels(zoneId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    enabled: !!zoneId, // TanStack Query Guard: Prevents execution until zoneId exists
  });
}