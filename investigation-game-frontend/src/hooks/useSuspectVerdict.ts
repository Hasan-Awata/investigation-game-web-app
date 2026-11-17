import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { submitSuspectVerdict, type SubmitSuspectVerdictResponse } from '@/services/api';
import { getSafeStorage, setSafeStorage, clearRoomSessionData } from '@/utils/storage';
import { isVerdictReady, moveCharacter, normalizeGuiltyIds, type CharacterPoolId } from '@/utils/characterVerdict';
import { useGameMutation } from './useGameMutation';
import type { GameRoom } from '@/types';

interface VerdictScope {
  roomId: number;
  inviteCode: string;
  storageKey: string;
}

interface VerdictState extends VerdictSubmission {
  feedback: { type: 'success' | 'error'; message: string } | null;
  isSubmitting: boolean;
}

interface VerdictSubmission {
  scope: VerdictScope;
  guiltyIds: number[];
}

function createState(room: GameRoom): VerdictState {
  const storageKey = `room_${room.invite_code}_guilty_characters`;
  return {
    scope: { roomId: room.id, inviteCode: room.invite_code, storageKey },
    guiltyIds: normalizeGuiltyIds(getSafeStorage<unknown[]>('session', storageKey, [])),
    feedback: null,
    isSubmitting: false,
  };
}

export function useSuspectVerdict(
  room: GameRoom,
  refreshRoomData: () => void | Promise<void>,
  setGameOverData: (message: string, stats?: unknown) => void,
) {
  const [state, setState] = useState(() => createState(room));
  // Reset before committing children when the same layout receives another room.
  if (state.scope.roomId !== room.id || state.scope.inviteCode !== room.invite_code) {
    setState(createState(room));
  }
  const { scope, guiltyIds, feedback, isSubmitting } = state;
  const activeScope = useRef<VerdictScope | null>(null);
  const finalizedScope = useRef<VerdictScope | null>(null);
  const pendingSubmission = useRef<VerdictSubmission | null>(null);
  const latestSelection = useRef<VerdictSubmission | null>(null);

  useLayoutEffect(() => {
    activeScope.current = scope;
    return () => { activeScope.current = null; };
  }, [scope]);

  useEffect(() => {
    if (finalizedScope.current !== scope) setSafeStorage('session', scope.storageKey, guiltyIds);
  }, [scope, guiltyIds]);

  const refresh = useCallback(() => {
    // A refresh failure must never turn an accepted verdict into a rejection.
    void Promise.resolve().then(refreshRoomData).catch((error: unknown) => {
      console.warn('Failed to refresh room after verdict action.', error);
    });
  }, [refreshRoomData]);

  const verdictMutation = useGameMutation<SubmitSuspectVerdictResponse, VerdictSubmission>({
    mutationFn: request => submitSuspectVerdict(request.scope.roomId, request.guiltyIds),
    dispatchErrorFeedback: false,
    onSuccess: (data, request) => {
      if (activeScope.current !== request.scope) return;
      if (data.status === 'failed') {
        setState(previous => ({ ...previous, feedback: { type: 'error', message: data.message } }));
      } else {
        finalizedScope.current = request.scope;
        clearRoomSessionData(request.scope.roomId, request.scope.inviteCode);
        setGameOverData(data.message, data.stats);
      }
      refresh();
    },
    onError: (error, request) => {
      if (activeScope.current === request.scope) {
        setState(previous => ({ ...previous, feedback: { type: 'error', message: error.message } }));
      }
    },
    onSettled: (_data, _error, request) => {
      if (pendingSubmission.current === request) pendingSubmission.current = null;
      if (activeScope.current === request.scope) setState(previous => ({ ...previous, isSubmitting: false }));
    },
  });

  const handleCharacterDrop = useCallback((characterId: number, targetPool: CharacterPoolId) => {
    if (activeScope.current !== scope || finalizedScope.current === scope) return;
    const current = latestSelection.current?.scope === scope ? latestSelection.current.guiltyIds : guiltyIds;
    const next = moveCharacter(current, characterId, targetPool);
    // Event-time snapshot also handles multiple drops followed by submission in one tick.
    latestSelection.current = { scope, guiltyIds: next };
    setState(previous => ({ ...previous, guiltyIds: next }));
  }, [scope, guiltyIds]);

  const submitVerdict = () => {
    if (activeScope.current !== scope || finalizedScope.current === scope || !isVerdictReady(room) || pendingSubmission.current?.scope === scope) return;
    const selected = latestSelection.current?.scope === scope ? latestSelection.current.guiltyIds : guiltyIds;
    const request = { scope, guiltyIds: [...selected] };
    pendingSubmission.current = request;
    setState(previous => ({ ...previous, isSubmitting: true }));
    verdictMutation.mutate(request);
  };

  const clearFeedback = () => {
    if (activeScope.current !== scope) return;
    setState(previous => ({ ...previous, feedback: null }));
    refresh();
  };

  return { guiltyIds, feedback, isSubmitting, handleCharacterDrop, submitVerdict, clearFeedback };
}
