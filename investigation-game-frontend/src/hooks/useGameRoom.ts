import { useQuery } from '@tanstack/react-query';
import { joinRoom, fetchRoomState } from '@/services/api';
import type { Evidence } from '@/types';

// Track BOTH the invite code and the ID to prevent cross-room contamination
let joinedInviteCode: string | null = null;
let activeRoomId: number | null = null;

export function useGameRoom(inviteCode: string | undefined) {
  
  const { 
    data: room, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['gameRoom', inviteCode],
    queryFn: async () => {
      if (!inviteCode) throw new Error('No invite code provided.');
      
      // Only hit the join endpoint if we haven't joined THIS specific room yet
      if (joinedInviteCode !== inviteCode || !activeRoomId) {
        const joinResult = await joinRoom(inviteCode);
        if (!joinResult.isSuccess) throw new Error(joinResult.errorMessage);
        
        // Sync the global cache with the new session
        joinedInviteCode = inviteCode;
        activeRoomId = joinResult.value.id;
      }

      // Safely fetch the state using the correctly matched Room ID
      const stateResult = await fetchRoomState(activeRoomId);
      if (!stateResult.isSuccess) throw new Error(stateResult.errorMessage);

      return stateResult.value;
    },
    enabled: !!inviteCode, 
  });

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