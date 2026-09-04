import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRoomState, useRoomActions } from '@/context/RoomContext';
import type { Choice } from '@/types';
import { lockVote, submitAssessment, initiatePhase, triggerWiretap } from '@/services/api';

export type { ToastNotification, GlobalFeedback } from '@/context/RoomContext';

interface ApiError { title?: string; message: any; }

export function useInvestigationPhase() {
  const { t } = useTranslation();
  const { room } = useRoomState();
  const { refreshRoomData, addGlobalToast, setGlobalFeedback } = useRoomActions();

  const [localVotes, setLocalVotes] = useState<Record<number, number>>({});
  const roomId = room.id;

  // --- Helper to strictly extract strings and prevent React object-child crashes ---
  const getSafeString = (val: any, fallback: string): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val.message === 'string') return val.message;
    if (val.message && typeof val.message.message === 'string') return val.message.message;
    return fallback;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    if (!currentUser) return;

    const serverVotes: Record<number, number> = {};
    room.votes?.forEach((vote: any) => {
      if (vote.user_id === currentUser.id) {
        serverVotes[vote.question_id] = vote.choice_id;
      }
    });
    setLocalVotes(serverVotes);
  }, [room.votes]);

  const voteMutation = useMutation({
    mutationFn: async ({ questionId, choiceId }: { questionId: number, choiceId: number }) => {
      const result = await lockVote(roomId, questionId, choiceId);
      if (!result.isSuccess) throw new Error(result.errorMessage as string);
      return result.value;
    },
    onSuccess: () => refreshRoomData()
  });

  const submitTheoryMutation = useMutation({
    mutationFn: async () => {
      const result = await submitAssessment(roomId);
      if (!result.isSuccess) throw { message: result.errorMessage };
      return result.value;
    },
    onSuccess: async (data) => {
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
    },
    onError: (error: ApiError) => {
      // Safely parse the title and message so React never receives an object
      const safeTitle = error.title || error?.message?.title || t('pages.gameRoom.hooks.phase.systemError');
      const safeMessage = getSafeString(error.message, t('pages.gameRoom.hooks.phase.systemError'));
      
      setGlobalFeedback({ type: 'error', title: safeTitle, message: safeMessage });
    }
  });

  const initiatePhaseMutation = useMutation({
    mutationFn: async (levelId: number) => {
      const result = await initiatePhase(roomId, levelId);
      if (!result.isSuccess) throw { message: result.errorMessage };
      return result.value;
    },
    onSuccess: () => refreshRoomData(),
    onError: (error: ApiError) => {
      setGlobalFeedback({
        type: 'error', 
        title: error.title || t('pages.gameRoom.hooks.phase.systemError'), 
        message: getSafeString(error.message, t('pages.gameRoom.hooks.phase.systemError'))
      });
    }
  });

  const triggerWiretapMutation = useMutation({
    mutationFn: async ({ questionId, audioUrl }: { questionId: number, audioUrl: string }) => {
      const result = await triggerWiretap(roomId, questionId);
      if (!result.isSuccess) throw { message: result.errorMessage };
      return { value: result.value, audioUrl };
    },
    onSuccess: () => refreshRoomData(),
    onError: (error: ApiError) => {
      setGlobalFeedback({
        type: 'error', 
        title: error.title || t('pages.gameRoom.hooks.phase.transmissionError'), 
        message: getSafeString(error.message, t('pages.gameRoom.hooks.phase.transmissionError'))
      });
    }
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
    if (choice.outcomes?.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) {
      addGlobalToast({
        type: 'suspect', 
        title: t('pages.gameRoom.hooks.phase.personOfInterest'), 
        message: t('pages.gameRoom.hooks.phase.personOfInterestMsg'),
        icon: 'https://api.iconify.design/ph:user-focus-duotone.svg?color=%23a33232'
      });
    }
    if (choice.outcomes?.unlock_victims && choice.outcomes.unlock_victims.length > 0) {
      addGlobalToast({
        type: 'victim', 
        title: t('pages.gameRoom.hooks.phase.casualtyIdentified'), 
        message: t('pages.gameRoom.hooks.phase.casualtyIdentifiedMsg'),
        icon: 'https://api.iconify.design/ph:skull-duotone.svg?color=%238a8d91'
      });
    }

    voteMutation.mutate({ questionId, choiceId: choice.id });
  };

  const handleSubmitTheory = (e?: React.MouseEvent | any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    submitTheoryMutation.mutate();
  };

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