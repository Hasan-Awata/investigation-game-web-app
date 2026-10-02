import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomState, useRoomActions } from '@/context/RoomContext';
import { useGameMutation } from './useGameMutation';
import { getLocalUser } from '@/utils/userState';
import { getSafeString } from '@/utils/parsers';
import type { Choice } from '@/types';
import { lockVote, submitAssessment, initiatePhase, triggerWiretap } from '@/services/api';

export type { ToastNotification, GlobalFeedback } from '@/context/RoomContext';

export function useInvestigationPhase() {
  const { t } = useTranslation();
  const { room } = useRoomState();
  const { refreshRoomData, addGlobalToast, setGlobalFeedback } = useRoomActions();

  const [localVotes, setLocalVotes] = useState<Record<number, number>>({});
  const roomId = room.id;

  useEffect(() => {
    const currentUser = getLocalUser();
    if (!currentUser) return;

    const serverVotes: Record<number, number> = {};
    room.votes?.forEach((vote: any) => {
      if (vote.user_id === currentUser.id) {
        serverVotes[vote.question_id] = vote.choice_id;
      }
    });
    setLocalVotes(serverVotes);
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

        // 1. UPDATE STATE IMMEDIATELY (Eliminates the 4-second block)
        setLocalVotes({});
        refreshRoomData();

        // 2. ONLY DELAY THE MODAL DISMISSAL
        setTimeout(() => {
          setGlobalFeedback(null);
        }, 4000);
      } else {
        setGlobalFeedback({
          type: 'error',
          title: t('pages.gameRoom.hooks.phase.theoryRejected'),
          message: getSafeString(data.message, t('pages.gameRoom.hooks.phase.systemError'))
        });
        setLocalVotes({});
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
  const handleSelectChoice = (e: React.MouseEvent | any, questionId: number, choice: Choice, status: string) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (status !== 'active') return;

    setLocalVotes(prev => ({ ...prev, [questionId]: choice.id }));

    if (choice.outcomes?.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) {
      addGlobalToast({
        type: 'evidence', 
        title: t('pages.gameRoom.hooks.phase.evidenceRecovered'), 
        message: t('pages.gameRoom.hooks.phase.evidenceRecoveredMsg', { count: choice.outcomes.unlock_evidence.length }),
        icon: 'https://api.iconify.design/ph:file-magnifying-glass-duotone.svg?color=%23c48b36'
      });
    }
    if (choice.outcomes?.unlock_levels && choice.outcomes.unlock_levels.length > 0) {
      addGlobalToast({
        type: 'level', 
        title: t('pages.gameRoom.hooks.phase.phaseUnlocked'), 
        message: t('pages.gameRoom.hooks.phase.phaseUnlockedMsg'),
        icon: 'https://api.iconify.design/ph:git-merge-duotone.svg?color=%235a8a9e'
      });
    }
    if (choice.outcomes?.character_updates && choice.outcomes.character_updates.length > 0) {
      choice.outcomes.character_updates.forEach((update: any) => {
        if (update.is_unlocked) {
          addGlobalToast({
            type: 'character', // Custom type for styling
            title: t('pages.gameRoom.hooks.phase.personOfInterest'),
            message: t('pages.gameRoom.hooks.phase.personOfInterestMsg'),
            icon: 'https://api.iconify.design/ph:user-focus-duotone.svg?color=%23a33232'
          });
        }
        if (update.status === 'deceased') {
          addGlobalToast({
            type: 'system',
            title: t('pages.gameRoom.hooks.phase.casualtyIdentified', 'Critical Update'),
            message: t('pages.gameRoom.hooks.phase.casualtyIdentifiedMsg', 'A person of interest has been confirmed deceased.'),
            icon: 'https://api.iconify.design/ph:skull-duotone.svg?color=%238a8d91'
          });
        }
      });
    }

    voteMutation.mutate({ questionId, choiceId: choice.id });
  };

  const handleSubmitTheory = useCallback((e?: React.MouseEvent | any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    // STRICT GUARD: Block submission entirely if the room has no active level currently in play
    if (room.current_level_id === null || room.current_level_id === undefined) {
      return;
    }

    submitTheoryMutation.mutate();
  }, [room.current_level_id, submitTheoryMutation]);

  const clearFeedback = (e?: React.MouseEvent | any) => {
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