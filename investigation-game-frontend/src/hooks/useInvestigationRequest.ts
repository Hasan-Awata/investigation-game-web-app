import { useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { submitInvestigationRequest, type InvestigationRequestResponse } from '@/services/api';
import { useGameMutation } from './useGameMutation';
import { useSafeTimeout } from './useSafeTimeout';
import type { GameRoom } from '@/types';
import { useRoomUI } from '@/context/RoomContext.shared';
import { patchArray } from '@/utils/parsers';

interface RequestScope { roomId: number; inviteCode: string }
interface TrayState {
  scope: RequestScope;
  selectedRequestId: number | null;
  trayEvidences: number[];
  trayCharacters: number[];
  feedback: { type: 'error'; message: string } | null;
  isSubmitting: boolean;
}
interface RequestSubmission {
  scope: RequestScope;
  requestId: number;
  evidenceIds: number[];
  characterIds: number[];
}

const createState = (room: GameRoom): TrayState => ({
  scope: { roomId: room.id, inviteCode: room.invite_code },
  selectedRequestId: null, trayEvidences: [], trayCharacters: [], feedback: null, isSubmitting: false,
});

export function useInvestigationRequest(room: GameRoom, refreshRoomData: () => void | Promise<void>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addGlobalToast } = useRoomUI();
  const safeTimeout = useSafeTimeout();
  const [state, setState] = useState(() => createState(room));
  const proceduralRequests = room.procedural_requests ?? [];
  const completedRequestIds = room.completed_requests?.map(request => request.id) ?? [];
  const selectedRequest = proceduralRequests.find(request => request.id === state.selectedRequestId
    && !completedRequestIds.includes(request.id));

  // Reset before committing children, including when a teammate approves our target.
  if (state.scope.roomId !== room.id || state.scope.inviteCode !== room.invite_code) {
    setState(createState(room));
  } else if (state.selectedRequestId !== null && !selectedRequest) {
    setState({ ...state, selectedRequestId: null });
  }

  const { scope } = state;
  const activeScope = useRef<RequestScope | null>(null);
  const pendingSubmission = useRef<RequestSubmission | null>(null);
  useLayoutEffect(() => {
    activeScope.current = scope;
    return () => { activeScope.current = null; };
  }, [scope]);

  const refresh = () => {
    void Promise.resolve().then(refreshRoomData).catch((error: unknown) => {
      console.warn('Failed to refresh room after procedural request.', error);
    });
  };

  const requestMutation = useGameMutation<InvestigationRequestResponse, RequestSubmission>({
    mutationFn: ({ scope: requestScope, ...payload }) => submitInvestigationRequest(requestScope.roomId, payload),
    dispatchErrorFeedback: false,
    onMutate: async submission => {
      await queryClient.cancelQueries({ queryKey: ['gameRoom', submission.scope.inviteCode] });
    },
    onError: (error, submission) => {
      if (activeScope.current !== submission.scope) return;
      setState(previous => ({ ...previous, feedback: { type: 'error', message: error.message } }));
      refresh();
    },
    onSuccess: (data, submission) => {
      if (activeScope.current !== submission.scope) return;
      queryClient.setQueryData<GameRoom>(['gameRoom', submission.scope.inviteCode], old => old && ({
        ...old,
        completed_requests: patchArray(old.completed_requests, [{ id: data.request_id }]),
      }));
      setState(previous => ({ ...previous, selectedRequestId: null, trayEvidences: [], trayCharacters: [], feedback: null }));
      refresh();
      safeTimeout(() => {
        if (activeScope.current !== submission.scope) return;
        if (data.unlocked_evidence.length > 0) {
          addGlobalToast({
            type: 'evidence', title: t('pages.gameRoom.hooks.request.proceduralApproved'),
            message: t('pages.gameRoom.hooks.request.proceduralApprovedMsg'), icon: 'proceduralApproved',
          });
        }
        if (data.unlocked_levels.length > 0) {
          addGlobalToast({
            type: 'level', title: t('pages.gameRoom.hooks.request.warrantExecuted'),
            message: t('pages.gameRoom.hooks.request.warrantExecutedMsg'), icon: 'warrantExecuted',
          });
        }
      }, 500);
    },
    onSettled: (_data, _error, submission) => {
      if (pendingSubmission.current === submission) pendingSubmission.current = null;
      if (activeScope.current === submission.scope) setState(previous => ({ ...previous, isSubmitting: false }));
    },
  });

  const canEdit = () => activeScope.current === scope && room.status === 'active'
    && pendingSubmission.current?.scope !== scope;
  const selectRequest = (requestId: number) => {
    if (!canEdit() || completedRequestIds.includes(requestId) || !proceduralRequests.some(request => request.id === requestId)) return;
    setState(previous => ({ ...previous, selectedRequestId: requestId }));
  };
  const clearSelection = () => {
    setState(previous => previous.selectedRequestId === null ? previous : { ...previous, selectedRequestId: null });
  };
  const addEvidenceToTray = (id: number) => {
    if (canEdit()) setState(previous => previous.trayEvidences.includes(id) ? previous
      : { ...previous, trayEvidences: [...previous.trayEvidences, id] });
  };
  const addCharacterToTray = (id: number) => {
    if (canEdit()) setState(previous => previous.trayCharacters.includes(id) ? previous
      : { ...previous, trayCharacters: [...previous.trayCharacters, id] });
  };
  const removeItem = (id: number, type: 'evidence' | 'character') => {
    if (!canEdit()) return;
    setState(previous => type === 'evidence'
      ? { ...previous, trayEvidences: previous.trayEvidences.filter(item => item !== id) }
      : { ...previous, trayCharacters: previous.trayCharacters.filter(item => item !== id) });
  };
  const submitRequest = () => {
    if (!canEdit() || !selectedRequest || state.trayEvidences.length + state.trayCharacters.length < 2) return;
    const submission = { scope, requestId: selectedRequest.id, evidenceIds: [...state.trayEvidences], characterIds: [...state.trayCharacters] };
    pendingSubmission.current = submission;
    setState(previous => ({ ...previous, isSubmitting: true, feedback: null }));
    requestMutation.mutate(submission);
  };

  return {
    trayEvidences: state.trayEvidences, trayCharacters: state.trayCharacters,
    selectedRequestId: selectedRequest?.id ?? null, proceduralRequests, completedRequestIds, selectRequest, clearSelection,
    addEvidenceToTray, addCharacterToTray, removeItem, submitRequest,
    isSubmitting: state.isSubmitting, feedback: state.feedback,
    clearFeedback: () => setState(previous => ({ ...previous, feedback: null })),
  };
}
