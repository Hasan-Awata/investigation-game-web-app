import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { submitSuspectVerdict, type SubmitSuspectVerdictResponse } from '@/services/api';
import { getSafeStorage, setSafeStorage, clearRoomSessionData } from '@/utils/storage';
import { isVerdictReady, moveCharacter, normalizeCharacterIds, type CharacterPoolId, type CharacterPoolOrder } from '@/utils/characterVerdict';
import { useGameMutation } from './useGameMutation';
import type { GameRoom } from '@/types';

interface VerdictScope {
  roomId: number;
  inviteCode: string;
  storageKeys: Record<CharacterPoolId, string>;
}

interface VerdictState {
  scope: VerdictScope;
  characterOrder: CharacterPoolOrder;
  feedback: { type: 'success' | 'error'; message: string } | null;
  isSubmitting: boolean;
}

interface VerdictSubmission {
  scope: VerdictScope;
  guiltyIds: number[];
}

function createState(room: GameRoom): VerdictState {
  const storageKeys = {
    guilty: `room_${room.invite_code}_guilty_characters`,
    unassigned: `room_${room.invite_code}_unassigned_characters`,
  };
  return {
    scope: { roomId: room.id, inviteCode: room.invite_code, storageKeys },
    characterOrder: {
      guilty: normalizeCharacterIds(getSafeStorage<unknown[]>('session', storageKeys.guilty, [])),
      unassigned: normalizeCharacterIds(getSafeStorage<unknown[]>('session', storageKeys.unassigned, [])),
    },
    feedback: null,
    isSubmitting: false,
  };
}

export function useSuspectVerdict(
  room: GameRoom,
  refreshRoomData: () => void | Promise<void>,
  setGameOverData: (message: string, stats?: unknown) => void,
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [state, setState] = useState(() => createState(room));
  // Reset before committing children when the same layout receives another room.
  if (state.scope.roomId !== room.id || state.scope.inviteCode !== room.invite_code) {
    setState(createState(room));
  }
  const { scope, characterOrder, feedback, isSubmitting } = state;
  const activeScope = useRef<VerdictScope | null>(null);
  const finalizedScope = useRef<VerdictScope | null>(null);
  const pendingSubmission = useRef<VerdictSubmission | null>(null);
  const latestOrder = useRef<Pick<VerdictState, 'scope' | 'characterOrder'> | null>(null);

  useLayoutEffect(() => {
    activeScope.current = scope;
    return () => { activeScope.current = null; };
  }, [scope]);

  useEffect(() => {
    if (finalizedScope.current === scope) return;
    setSafeStorage('session', scope.storageKeys.guilty, characterOrder.guilty);
    setSafeStorage('session', scope.storageKeys.unassigned, characterOrder.unassigned);
  }, [scope, characterOrder]);

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
      const remaining = data.management_trust;
      if (remaining !== undefined) {
        queryClient.setQueryData<GameRoom>(['gameRoom', request.scope.inviteCode], old => old && ({
          ...old,
          management_trust: Math.min(old.management_trust ?? 100, remaining),
          ...(remaining === 0 ? { status: 'failed', final_stats: data.stats } : {}),
        }));
      }
      if (data.status === 'failed') {
        const loss = remaining === undefined ? '' : ' ' + t('gameRoom.trustLoss.verdict', { loss: data.trust_loss, remaining });
        setState(previous => ({ ...previous, feedback: { type: 'error', message: data.message + loss } }));
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
    const current = latestOrder.current?.scope === scope ? latestOrder.current.characterOrder : characterOrder;
    const next = moveCharacter(current, characterId, targetPool);
    if (next === current) return;
    // Event-time snapshot also handles multiple drops followed by submission in one tick.
    latestOrder.current = { scope, characterOrder: next };
    setState(previous => ({ ...previous, characterOrder: next }));
  }, [scope, characterOrder]);

  const submitVerdict = () => {
    if (activeScope.current !== scope || finalizedScope.current === scope || !isVerdictReady(room) || pendingSubmission.current?.scope === scope) return;
    const order = latestOrder.current?.scope === scope ? latestOrder.current.characterOrder : characterOrder;
    const request = { scope, guiltyIds: [...order.guilty] };
    pendingSubmission.current = request;
    setState(previous => ({ ...previous, isSubmitting: true }));
    verdictMutation.mutate(request);
  };

  const clearFeedback = () => {
    if (activeScope.current !== scope) return;
    setState(previous => ({ ...previous, feedback: null }));
    refresh();
  };

  return { characterOrder, feedback, isSubmitting, handleCharacterDrop, submitVerdict, clearFeedback };
}
