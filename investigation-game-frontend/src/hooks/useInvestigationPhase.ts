import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Choice, GameRoom } from '@/types';
import { lockVote, submitAssessment, initiatePhase, triggerWiretap } from '@/services/api'; 

export interface ToastNotification {
  id: string;
  type: 'evidence' | 'level' | 'suspect' | 'victim';
  title: string;
  message: string;
  icon: string;
}

// --- NEW: STRICT PAYLOAD INTERFACES ---
interface WiretapTriggeredPayload {
  question_id: number;
  audio_url: string | null;
  message?: string;
}

// Standardize expected API error structure
interface ApiError {
  title?: string;
  message: string;
}

export function useInvestigationPhase(room: GameRoom, refreshRoomData: () => void) {
  const [localVotes, setLocalVotes] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  const locallyTriggered = useRef<Set<number>>(new Set());
  const roomId = room.id;

  const addToast = (toastData: Omit<ToastNotification, 'id'>) => {
    const newToast: ToastNotification = { ...toastData, id: crypto.randomUUID() };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  useEffect(() => {
    if (!window.Echo) return;
    const channel = window.Echo.private(`room.${roomId}`);
    
    channel.listen('VoteLockedIn', () => {
      refreshRoomData();
    });

    // STRICT TYPING APPLIED HERE
    channel.listen('WiretapTriggered', (e: WiretapTriggeredPayload) => {
      if (e.audio_url && !locallyTriggered.current.has(e.question_id)) {
        const audio = new Audio(e.audio_url);
        audio.play().catch(err => console.error('Browser blocked autoplay:', err));
      }

      addToast({
        type: 'evidence', 
        title: 'WIRETAP INTERCEPTED', 
        message: e.message || 'Audio feed active. Listen carefully.',
        icon: 'https://api.iconify.design/ph:waveform-duotone.svg?color=%23c48b36'
      });

      refreshRoomData();
    });

    return () => {
      channel.stopListening('VoteLockedIn');
      channel.stopListening('WiretapTriggered'); 
    };
  }, [roomId, refreshRoomData]);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    if (!currentUser) return;

    const serverVotes: Record<number, number> = {};
    room.votes?.forEach(vote => {
      if (vote.user_id === currentUser.id) {
        serverVotes[vote.question_id] = vote.choice_id;
      }
    });
    setLocalVotes(serverVotes);
  }, [room.votes]);

  const voteMutation = useMutation({
    mutationFn: async ({ questionId, choiceId }: { questionId: number, choiceId: number }) => {
      const result = await lockVote(roomId, questionId, choiceId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      refreshRoomData();
    }
  });

  const submitTheoryMutation = useMutation({
    mutationFn: async () => {
      const result = await submitAssessment(roomId);
      if (!result.isSuccess) throw { message: result.errorMessage }; // Wrapped as ApiError structure
      return result.value;
    },
    onSuccess: async (data) => {
      if (data.status === 'success' || data.status === 'failed_final') {
        setFeedback({ 
          type: data.status === 'success' ? 'success' : 'error', 
          title: data.status === 'success' ? 'Consensus Verified' : 'Theory Rejected',
          message: data.message 
        });
        
        setTimeout(() => {
          setFeedback(null);
          setLocalVotes({}); 
          refreshRoomData(); 
        }, 2000);
      } else {
        setFeedback({ type: 'error', title: 'Theory Rejected', message: data.message });
        setLocalVotes({}); 
        refreshRoomData(); 
      }
    },
    // STRICT TYPING APPLIED HERE
    onError: (error: ApiError) => {
      setFeedback({ type: 'error', title: error.title || 'Error', message: error.message });
    }
  });

  const initiatePhaseMutation = useMutation({
    mutationFn: async (levelId: number) => {
      const result = await initiatePhase(roomId, levelId);
      if (!result.isSuccess) throw { message: result.errorMessage }; 
      return result.value;
    },
    onSuccess: () => refreshRoomData(),
    // STRICT TYPING APPLIED HERE
    onError: (error: ApiError) => setFeedback({ 
      type: 'error', title: error.title || 'System Error', message: error.message 
    })
  });

  const triggerWiretapMutation = useMutation({
    mutationFn: async ({ questionId, audioUrl }: { questionId: number, audioUrl: string }) => {
      locallyTriggered.current.add(questionId); 
      const result = await triggerWiretap(roomId, questionId);
      if (!result.isSuccess) throw { message: result.errorMessage }; 
      return { value: result.value, audioUrl };
    },
    onSuccess: (data) => {
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.play().catch(err => console.error('Audio playback failed:', err));
      }
      refreshRoomData(); 
    },
    // STRICT TYPING APPLIED HERE
    onError: (error: ApiError) => setFeedback({ 
      type: 'error', title: error.title || 'Transmission Error', message: error.message 
    })
  });
  
  const handleSelectChoice = (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => {
    e.stopPropagation(); 
    if (status !== 'active') return; 

    setLocalVotes(prev => ({ ...prev, [questionId]: choice.id }));

    if (choice.outcomes?.unlock_evidence && choice.outcomes.unlock_evidence.length > 0) {
      addToast({ 
        type: 'evidence', title: 'EVIDENCE RECOVERED', message: `${choice.outcomes.unlock_evidence.length} new piece(s) of physical evidence secured.`, 
        icon: 'https://api.iconify.design/ph:file-magnifying-glass-duotone.svg?color=%23c48b36' 
      });
    }
    if (choice.outcomes?.unlock_levels && choice.outcomes.unlock_levels.length > 0) {
      addToast({ 
        type: 'level', title: 'PHASE UNLOCKED', message: 'A new narrative path is now available.', 
        icon: 'https://api.iconify.design/ph:git-merge-duotone.svg?color=%235a8a9e' 
      });
    }
    if (choice.outcomes?.unlock_suspects && choice.outcomes.unlock_suspects.length > 0) {
      addToast({ 
        type: 'suspect', title: 'PERSON OF INTEREST', message: 'New suspect added to the board.', 
        icon: 'https://api.iconify.design/ph:user-focus-duotone.svg?color=%23a33232' 
      });
    }
    if (choice.outcomes?.unlock_victims && choice.outcomes.unlock_victims.length > 0) {
      addToast({ 
        type: 'victim', title: 'CASUALTY IDENTIFIED', message: 'New victim details have been verified.', 
        icon: 'https://api.iconify.design/ph:skull-duotone.svg?color=%238a8d91' 
      });
    }

    voteMutation.mutate({ questionId, choiceId: choice.id });
  };

  const handleSubmitTheory = (e: React.MouseEvent) => {
    e.stopPropagation();
    submitTheoryMutation.mutate();
  };

  const clearFeedback = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFeedback(null);
  };

  return {
    localVotes,
    isSubmitting: submitTheoryMutation.isPending || voteMutation.isPending,
    isInitiating: initiatePhaseMutation.isPending,
    feedback,
    toasts, 
    handleSelectChoice,
    handleSubmitTheory,
    initiatePhase: (levelId: number) => initiatePhaseMutation.mutate(levelId),
    clearFeedback,
    triggerWiretap: (questionId: number, audioUrl: string) => triggerWiretapMutation.mutate({ questionId, audioUrl }), 
    isTriggeringWiretap: triggerWiretapMutation.isPending,
    addToast
  };
}