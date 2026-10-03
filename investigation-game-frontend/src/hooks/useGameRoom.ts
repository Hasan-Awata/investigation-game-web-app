import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { joinRoom, fetchRoomState } from '@/services/api';
import { getSafeStringStorage, setSafeStringStorage } from '@/utils/storage';
import type { GameRoom, Evidence, Character } from '@/types';

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

      // OPAQUE identifier, not structured data: kept as a bare string so the
      // reader below stays a plain parseInt. The JSON helpers would quote the
      // value on write and fail to parse it on read (and purge it). Writer and
      // reader must both stay raw -- see getSafeStringStorage in utils/storage.
      const storageKey = `active_room_id_for_${inviteCode}`;
      let roomId = getSafeStringStorage('session', storageKey, '');

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

  useEffect(() => {
if (room?.id && inviteCode) {
        // Same opaque raw-string contract as the read above; the key template
        // is intentionally inlined rather than hoisted, matching the read site.
        setSafeStringStorage('session', `active_room_id_for_${inviteCode}`, room.id.toString());
      }
  }, [room?.id, inviteCode]);

  const patchRoomData = (updater: (oldRoom: GameRoom) => GameRoom) => {
    if (inviteCode) {
      queryClient.setQueryData(['gameRoom', inviteCode], (oldData: GameRoom | undefined) => {
        if (!oldData) return oldData;
        return updater(oldData);
      });
    }
  };

  const accumulatedEvidences: Evidence[] = room?.accumulated_evidences || [];
  const accumulatedCharacters: Character[] = room?.accumulated_characters || [];

  return {
    room,
    isLoading,
    error: error instanceof Error ? error.message : null,
    accumulatedEvidences,
    accumulatedCharacters,
    refreshRoomData: async () => { await refetch(); },
    patchRoomData
  };
}