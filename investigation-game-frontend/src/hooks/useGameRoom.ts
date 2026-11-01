import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { joinRoom, fetchRoomState } from '@/services/api';
import { getSafeStringStorage, setSafeStringStorage } from '@/utils/storage';
import type { GameRoom, Evidence, Character } from '@/types';

/**
 * Reads the OPAQUE stored room id for an invite code (raw string — see the
 * getSafeStringStorage contract in utils/storage); null when not stored.
 */
const readStoredRoomId = (inviteCode: string | undefined): number | null => {
  if (!inviteCode) return null;
  const raw = getSafeStringStorage('session', `active_room_id_for_${inviteCode}`, '');
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export function useGameRoom(inviteCode: string | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  /**
   * Join barrier: room joining is a state-mutating POST and lives in a
   * `useMutation`, never inside a queryFn. The state is keyed by invite code
   * so navigating between rooms resets it deterministically.
   */
  const [joinState, setJoinState] = useState(() => ({
    inviteCode,
    roomId: readStoredRoomId(inviteCode),
    error: null as string | null,
  }));

  if (joinState.inviteCode !== inviteCode) {
    setJoinState({ inviteCode, roomId: readStoredRoomId(inviteCode), error: null });
  }

  const joinMutation = useMutation({
    mutationFn: (code: string) => joinRoom(code),
    onSuccess: (result, code) => {
      setJoinState((prev) => prev.inviteCode !== code ? prev : ({
        ...prev,
        roomId: result.isSuccess ? result.value.id : null,
        error: result.isSuccess ? null : result.errorMessage,
      }));
    },
  });

  useEffect(() => {
    if (!inviteCode || joinState.roomId !== null || joinState.error !== null) return;
    if (joinMutation.isPending) return;
    joinMutation.mutate(inviteCode);
    // `mutate` identity is stable in React Query; the pending flag guards
    // against double-fire during the same commit window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, joinState.roomId, joinState.error, joinMutation.isPending]);

  const {
    data: room,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['gameRoom', joinState.inviteCode],
    queryFn: async () => {
      const roomId = joinState.roomId;
      if (!roomId) throw new Error(t('pages.gameRoom.noInviteCode'));

      // Strictly idempotent read: GET /rooms/{roomId} with no side effects.
      const stateResult = await fetchRoomState(roomId);
      if (!stateResult.isSuccess) throw new Error(stateResult.errorMessage);

      return stateResult.value;
    },
    enabled: !!joinState.inviteCode && joinState.roomId !== null,
    retry: false,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: (query) => query.state.data?.status === 'active' ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const recover = () => {
      if (joinState.roomId !== null) void refetch();
      else if (joinState.error && !joinMutation.isPending) {
        setJoinState(previous => ({ ...previous, error: null }));
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') recover(); };
    window.addEventListener('online', recover);
    window.addEventListener('pageshow', recover);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', recover);
      window.removeEventListener('pageshow', recover);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [joinState.roomId, joinState.error, joinMutation.isPending, refetch]);

  useEffect(() => {
if (room?.id && inviteCode) {
        // Same opaque raw-string contract as the read above.
        setSafeStringStorage('session', `active_room_id_for_${inviteCode}`, room.id.toString());
      }
  }, [room?.id, inviteCode]);

  const patchRoomData = useCallback((updater: (oldRoom: GameRoom) => GameRoom) => {
    if (inviteCode) {
      queryClient.setQueryData(['gameRoom', inviteCode], (oldData: GameRoom | undefined) => {
        if (!oldData) return oldData;
        return updater(oldData);
      });
    }
  }, [queryClient, inviteCode]);

  const refreshRoomData = useCallback(async () => { await refetch(); }, [refetch]);

  const errorObject = joinState.error
    ? new Error(joinState.error)
    : error;

  return {
    room,
    isLoading: isLoading || (joinState.roomId === null && joinMutation.isPending),
    error: !room && errorObject instanceof Error ? errorObject.message : null,
    accumulatedEvidences: room?.accumulated_evidences || [] as Evidence[],
    accumulatedCharacters: room?.accumulated_characters || [] as Character[],
    refreshRoomData,
    patchRoomData
  };
}
