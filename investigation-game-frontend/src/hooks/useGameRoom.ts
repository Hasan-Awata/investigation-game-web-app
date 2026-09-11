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
        return updater(oldData);
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