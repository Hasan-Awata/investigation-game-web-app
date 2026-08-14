// FILE: src/hooks/useGameRoom.ts
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { joinRoom, fetchRoomState } from '@/services/api';
import type { Evidence, Suspect, Victim } from '@/types';

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
      
      const storageKey = `active_room_id_for_${inviteCode}`;
      let roomId = sessionStorage.getItem(storageKey);

      if (!roomId) {
        const joinResult = await joinRoom(inviteCode);
        if (!joinResult.isSuccess) throw new Error(joinResult.errorMessage);
        
        roomId = joinResult.value.id.toString();
        // REMOVED: sessionStorage.setItem(storageKey, roomId); -> Side-effect removed from queryFn
      }

      const stateResult = await fetchRoomState(parseInt(roomId, 10));
      if (!stateResult.isSuccess) throw new Error(stateResult.errorMessage);

      return stateResult.value;
    },
    enabled: !!inviteCode, 
  });

  // Handle the side-effect purely based on successful data resolution
  useEffect(() => {
    if (room?.id && inviteCode) {
      sessionStorage.setItem(`active_room_id_for_${inviteCode}`, room.id.toString());
    }
  }, [room?.id, inviteCode]);

  const caseEvidences = room?.game_case?.evidences || [];
  const unlockedEvidenceIds = new Set(room?.unlocked_evidences?.map((e: Evidence) => e.id) || []);
  const accumulatedEvidences: Evidence[] = caseEvidences.filter(
    (evidence: Evidence) => evidence.is_initial || unlockedEvidenceIds.has(evidence.id)
  );

  const caseSuspects = room?.game_case?.suspects || [];
  const unlockedSuspectIds = new Set(room?.unlocked_suspects?.map((s: Suspect) => s.id) || []);
  const accumulatedSuspects: Suspect[] = caseSuspects.filter(
    (suspect: Suspect) => suspect.is_initial || unlockedSuspectIds.has(suspect.id)
  );

  const caseVictims = room?.game_case?.victims || [];
  const unlockedVictimIds = new Set(room?.unlocked_victims?.map((v: Victim) => v.id) || []);
  const accumulatedVictims: Victim[] = caseVictims.filter(
    (victim: Victim) => victim.is_initial || unlockedVictimIds.has(victim.id)
  );

  return { 
    room, 
    isLoading, 
    error: error instanceof Error ? error.message : null, 
    accumulatedEvidences, 
    accumulatedSuspects, 
    accumulatedVictims,
    refreshRoomData: async () => { await refetch(); } 
  };
}