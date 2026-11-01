import { useState, useCallback, useEffect, useRef } from 'react';
import { FORBIDDEN_EVENT, type ForbiddenDetail } from '@/services/request';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { joinRoom, fetchRoomState } from '@/services/api';
import { getSafeStringStorage, setSafeStringStorage } from '@/utils/storage';
import type { GameRoom, Evidence, Character } from '@/types';

class RoomRecoveryError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }

  get canRetry(): boolean {
    return ![400, 401, 403, 404, 410, 422].includes(this.status ?? 0);
  }
}

const canRetryError = (error: unknown): boolean => !(error instanceof RoomRecoveryError) || error.canRetry;

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
  const [denied, setDenied] = useState<string | null>(null);
  const deniedRef = useRef(false);
  const joinControllerRef = useRef<AbortController | null>(null);

  /**
   * Join barrier: room joining is a state-mutating POST and lives in a
   * `useMutation`, never inside a queryFn. The state is keyed by invite code
   * so navigating between rooms resets it deterministically.
   */
  const [joinState, setJoinState] = useState(() => ({
    inviteCode,
    roomId: readStoredRoomId(inviteCode),
    error: null as RoomRecoveryError | null,
  }));

  if (joinState.inviteCode !== inviteCode) {
    setDenied(null);
    setJoinState({ inviteCode, roomId: readStoredRoomId(inviteCode), error: null });
  }

  const joinMutation = useMutation({
    mutationFn: ({ code, signal }: { code: string; signal: AbortSignal }) => joinRoom(code, signal),
    onSuccess: (result, { code, signal }) => {
      if (signal.aborted) return;
      setJoinState((prev) => prev.inviteCode !== code ? prev : ({
        ...prev,
        roomId: result.isSuccess ? result.value.id : null,
        error: result.isSuccess ? null : new RoomRecoveryError(result.errorMessage, result.status),
      }));
    },
    onError: (error, { code, signal }) => {
      if (signal.aborted) return;
      setJoinState(previous => previous.inviteCode !== code ? previous : ({
        ...previous, error: new RoomRecoveryError(error.message),
      }));
    },
  });

  useEffect(() => {
    deniedRef.current = false;
    return () => joinControllerRef.current?.abort();
  }, [inviteCode]);

  useEffect(() => {
    if (!inviteCode || joinState.roomId !== null || joinState.error !== null) return;
    if (joinMutation.isPending) return;
    const controller = new AbortController();
    joinControllerRef.current = controller;
    joinMutation.mutate({ code: inviteCode, signal: controller.signal });
    // `mutate` identity is stable in React Query; the pending flag guards
    // against double-fire during the same commit window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, joinState.roomId, joinState.error, joinMutation.isPending]);

  const {
    data: room,
    isLoading,
    error,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['gameRoom', joinState.inviteCode],
    queryFn: async ({ signal }) => {
      const roomId = joinState.roomId;
      if (!roomId) throw new Error(t('pages.gameRoom.noInviteCode'));

      // Strictly idempotent read: GET /rooms/{roomId} with no side effects.
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener('abort', cancel, { once: true });
      const timeout = window.setTimeout(cancel, 15000);
      try {
        const stateResult = await fetchRoomState(roomId, controller.signal);
        if (!stateResult.isSuccess) throw new RoomRecoveryError(stateResult.errorMessage, stateResult.status);
        return stateResult.value;
      } finally {
        window.clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
      }
    },
    enabled: !denied && !!joinState.inviteCode && joinState.roomId !== null,
    retry: false,
    gcTime: 0,
    // Before the first snapshot succeeds, recovery is a deliberate player action.
    refetchOnReconnect: (query) => !!query.state.data && canRetryError(query.state.error),
    refetchOnWindowFocus: (query) => !!query.state.data && canRetryError(query.state.error),
    refetchInterval: (query) => !denied && query.state.data?.status === 'active'
      && canRetryError(query.state.error) ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ForbiddenDetail>).detail;
      const path = `/rooms/${joinState.roomId}`;
      if (deniedRef.current || (detail.endpoint !== path && !detail.endpoint.startsWith(`${path}/`))) return;
      if (detail.method !== 'GET') { void refetch({ cancelRefetch: false }); return; }
      deniedRef.current = true;
      setDenied(detail.message);
      void queryClient.cancelQueries({ queryKey: ['gameRoom', inviteCode] });
      queryClient.removeQueries({ queryKey: ['gameRoom', inviteCode] });
    };
    window.addEventListener(FORBIDDEN_EVENT, listener);
    return () => window.removeEventListener(FORBIDDEN_EVENT, listener);
  }, [joinState.roomId, inviteCode, queryClient, refetch]);

  useEffect(() => {
    const recover = () => {
      if (deniedRef.current) return;
      if (room && canRetryError(error)) void refetch({ cancelRefetch: false });
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
  }, [room, error, refetch]);

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

  const refreshRoomData = useCallback(async () => {
    if (deniedRef.current || joinState.roomId === null || !canRetryError(error)) return;
    await refetch({ cancelRefetch: false });
  }, [refetch, joinState.roomId, error]);

  const errorObject = joinState.error ?? error;
  const canRetry = !!inviteCode && !denied && !!errorObject
    && canRetryError(errorObject);
  const retryRoom = useCallback(() => {
    if (!canRetry) return;
    if (joinState.roomId !== null) { void refreshRoomData(); return; }
    if (!joinMutation.isPending) setJoinState(previous => ({ ...previous, error: null }));
  }, [canRetry, joinState.roomId, joinMutation.isPending, refreshRoomData]);

  return {
    room: denied ? undefined : room,
    accessDenied: denied,
    canRetry,
    retryRoom,
    isRecovering: isFetching || joinMutation.isPending,
    syncError: room && error instanceof Error ? error.message : null,
    isLoading: isLoading || (!!inviteCode && joinState.roomId === null && !joinState.error),
    error: !room && errorObject instanceof Error ? errorObject.message : null,
    accumulatedEvidences: !denied && room?.accumulated_evidences || [] as Evidence[],
    accumulatedCharacters: !denied && room?.accumulated_characters || [] as Character[],
    refreshRoomData,
    patchRoomData
  };
}
