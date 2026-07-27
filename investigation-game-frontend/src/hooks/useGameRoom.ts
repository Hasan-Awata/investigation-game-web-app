import { useQuery } from '@tanstack/react-query';
import { joinRoom, fetchRoomState } from '@/services/api';
import type { Evidence } from '@/types';

export function useGameRoom(inviteCode: string | undefined) {
  
  // 1. useQuery completely replaces useState and useEffect
  const { 
    data: room, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['gameRoom', inviteCode], // The unique cache key
    queryFn: async () => {
      if (!inviteCode) throw new Error('No invite code provided.');
      
      const joinResult = await joinRoom(inviteCode);
      if (!joinResult.isSuccess) throw new Error(joinResult.errorMessage);

      const stateResult = await fetchRoomState(joinResult.value.id);
      if (!stateResult.isSuccess) throw new Error(stateResult.errorMessage);

      return stateResult.value;
    },
    enabled: !!inviteCode, // Do not run the query until we have an invite code
  });

  // 2. Derive state directly from the cached data
  const currentLevelIndex = room?.game_case?.levels?.find(
    (l) => l.id === room.current_level_id
  )?.order_index || 0;

  const accumulatedEvidences: Evidence[] = room?.game_case?.levels
    ?.filter((level) => level.order_index <= currentLevelIndex)
    ?.flatMap((level) => level.evidences || []) || [];

  return { 
    room, 
    isLoading, 
    error: error instanceof Error ? error.message : null, 
    accumulatedEvidences, 
    refreshRoomData: async () => { 
      await refetch(); 
    } 
  };
}