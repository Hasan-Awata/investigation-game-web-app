import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext.shared';
import { useGameMutation } from './useGameMutation';
import { useSafeTimeout } from './useSafeTimeout';
import { getLocalUser } from '@/utils/userState';
import { getSafeString } from '@/utils/parsers';
import type { Choice, RoomVote } from '@/types';
import { lockVote, submitAssessment, initiatePhase, triggerWiretap } from '@/services/api';

export type { ToastNotification, GlobalFeedback } from '@/context/RoomContext';

export function useInvestigationPhase() {
  const { t } = useTranslation();
  const { room, refreshRoomData } = useRoomData();
  const { addGlobalToast, setGlobalFeedback } = useRoomUI();
  const safeTimeout = useSafeTimeout();

  const roomId = room.id;

  const localVotes = useMemo(() => {
    const currentUser = getLocalUser();
    if (!currentUser) return {};
    const serverVotes: Record<number, number> = {};
    room.votes?.forEach((vote: RoomVote) => {
      if (vote.user_id === currentUser.id) {
        serverVotes[vote.question_id] = vote.choice_id;
      }
    });
    return serverVotes;
  }, [room.votes]);

  const voteMutation = useGameMutation({
    mutationFn: ({ questionId, choiceId }: { questionId: number, choiceId: number }) =>
      lockVote(roomId, questionId, choiceId),
    onSuccess: () => refreshRoomData()
  });

  const submitTheoryMutation = useGameMutation({
    mutationFn: async () => {
      // STRICT GUARD
      if (room.current_level_id === null || room.current_level_id === undefined) {
        throw { message: 'No active level to submit.' };
      }

      return submitAssessment(roomId);
    },
    // The consensus outcome is branched on below, so the success dispatch is
    // left to `onSuccess` rather than the unified handler.
    errorTitle: 'pages.gameRoom.hooks.phase.systemError',
    onSuccess: (data) => {
      if (data.status === 'success' || data.status === 'failed_final') {
        setGlobalFeedback({
          type: data.status === 'success' ? 'success' : 'error',
          title: data.status === 'success' ? t('pages.gameRoom.hooks.phase.consensusVerified') : t('pages.gameRoom.hooks.phase.theoryRejected'),
          message: getSafeString(data.message, '')
        });

        refreshRoomData();

        // 2. ONLY DELAY THE MODAL DISMISSAL
        safeTimeout(() => {
          setGlobalFeedback(null);
        }, 4000);
      } else {
        setGlobalFeedback({
          type: 'error',
          title: t('pages.gameRoom.hooks.phase.theoryRejected'),
          message: getSafeString(data.message, t('pages.gameRoom.hooks.phase.systemError'))
        });
        refreshRoomData();
      }
    }
  });

  const initiatePhaseMutation = useGameMutation({
    mutationFn: (levelId: number) => initiatePhase(roomId, levelId),
    errorTitle: 'pages.gameRoom.hooks.phase.systemError',
    onSuccess: () => refreshRoomData()
  });

  const triggerWiretapMutation = useGameMutation({
    mutationFn: ({ questionId }: { questionId: number, audioUrl: string }) => triggerWiretap(roomId, questionId),
    errorTitle: 'pages.gameRoom.hooks.phase.transmissionError',
    onSuccess: () => refreshRoomData()
  });

  // --- NEW: Safe Event Handling ---
  type EventWithStop = React.MouseEvent | React.KeyboardEvent | undefined;

  const handleSelectChoice = (e: EventWithStop, questionId: number, choice: Choice, status: string) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (status !== 'active') return;

    // Unlock notifications are driven by the realtime ItemsUnlocked event so
    // every participant sees them. `choice.outcomes` is no longer sent to
    // clients (it is the answer key), so nothing is derived from it here.
    voteMutation.mutate({ questionId, choiceId: choice.id });
  };

  const handleSubmitTheory = useCallback((e?: EventWithStop) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    // STRICT GUARD: Block submission entirely if the room has no active level currently in play
    if (room.current_level_id === null || room.current_level_id === undefined) {
      return;
    }

    submitTheoryMutation.mutate();
  }, [room.current_level_id, submitTheoryMutation]);

  const clearFeedback = (e?: EventWithStop) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    setGlobalFeedback(null);
  };

  return {
    localVotes,
    isSubmitting: submitTheoryMutation.isPending || voteMutation.isPending,
    isInitiating: initiatePhaseMutation.isPending,
    handleSelectChoice,
    handleSubmitTheory,
    initiatePhase: (levelId: number) => initiatePhaseMutation.mutate(levelId),
    clearFeedback,
    triggerWiretap: (questionId: number, audioUrl: string) => triggerWiretapMutation.mutate({ questionId, audioUrl }),
    isTriggeringWiretap: triggerWiretapMutation.isPending,
    addToast: addGlobalToast
  };
}