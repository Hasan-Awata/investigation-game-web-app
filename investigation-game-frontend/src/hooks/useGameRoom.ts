import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { joinRoom, fetchRoomState } from '@/services/api';
import type { GameRoom, Evidence, Suspect, Victim } from '@/types';

export function useGameRoom(inviteCode: string | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: room,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['gameRoom', inviteCode],
    queryFn: async () => {
      if (!inviteCode) throw new Error(t('pages.gameRoom.noInviteCode'));

      const storageKey = `active_room_id_for_${inviteCode}`;
      let roomId = sessionStorage.getItem(storageKey);

      if (!roomId) {
        const joinResult = await joinRoom(inviteCode);
        if (!joinResult.isSuccess) throw new Error(joinResult.errorMessage);

        roomId = joinResult.value.id.toString();
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

  // Expose a pure cache patching function to enforce the "Zero-Refetch" rule
  const patchRoomData = (updater: (oldRoom: GameRoom) => GameRoom) => {
    if (inviteCode) {
      queryClient.setQueryData(['gameRoom', inviteCode], (oldData: GameRoom | undefined) => {
        if (!oldData) return oldData;
        
        const updatedRoom = updater(oldData);
        
        // AUTO-SYNC PRE-COMPILED ARRAYS
        // Syncs WebSocket payload data into the server's pre-compiled arrays to prevent UI desync,
        // eliminating the need for expensive `.filter()` operations on every React render cycle.
        
        if (updatedRoom.unlocked_evidences) {
            const newEvidences = updatedRoom.unlocked_evidences.filter(ue => !updatedRoom.accumulated_evidences?.some(ae => ae.id === ue.id));
            if (newEvidences.length) updatedRoom.accumulated_evidences = [...(updatedRoom.accumulated_evidences || []), ...newEvidences];
        }
        
        if (updatedRoom.unlocked_suspects) {
            const newSuspects = updatedRoom.unlocked_suspects.filter(us => !updatedRoom.accumulated_suspects?.some(as => as.id === us.id));
            if (newSuspects.length) updatedRoom.accumulated_suspects = [...(updatedRoom.accumulated_suspects || []), ...newSuspects];
        }
        
        if (updatedRoom.unlocked_victims) {
            const newVictims = updatedRoom.unlocked_victims.filter(uv => !updatedRoom.accumulated_victims?.some(av => av.id === uv.id));
            if (newVictims.length) updatedRoom.accumulated_victims = [...(updatedRoom.accumulated_victims || []), ...newVictims];
        }

        return updatedRoom;
      });
    }
  };

  // 🚀 SERVER IS AUTHORITATIVE: Render constraints stripped. Arrays assigned directly.
  const accumulatedEvidences: Evidence[] = room?.accumulated_evidences || [];
  const accumulatedSuspects: Suspect[] = room?.accumulated_suspects || [];
  const accumulatedVictims: Victim[] = room?.accumulated_victims || [];

  return {
    room,
    isLoading,
    error: error instanceof Error ? error.message : null,
    accumulatedEvidences,
    accumulatedSuspects,
    accumulatedVictims,
    refreshRoomData: async () => { await refetch(); },
    patchRoomData
  };
}