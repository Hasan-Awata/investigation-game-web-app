import { useQuery } from '@tanstack/react-query';
import { fetchAdminCases } from '@/services/adminApi';
import type { GameCase } from '@/types';

export function useAdminData() {
  return useQuery<GameCase[]>({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    // The data is cached automatically. Any mutation that invalidates 
    // 'adminCases' will trigger a background refetch seamlessly.
  });
}