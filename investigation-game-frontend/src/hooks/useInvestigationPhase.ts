import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Choice, GameRoom } from '@/types';
import { lockVote, submitAssessment, initiatePhase } from '@/services/api';

export function useInvestigationPhase(room: GameRoom, refreshRoomData: () => void) {
  const [localVotes, setLocalVotes] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const roomId = room.id;

  // 1. CLEAN ARCHITECTURE: Bind Real-Time WebSocket Sync
  useEffect(() => {
    if (!window.Echo) return;
    const channel = window.Echo.private(`room.${roomId}`);
    
    // Automatically fetch the fresh room state whenever any player in the world casts a vote
    channel.listen('VoteLockedIn', () => {
      refreshRoomData();
    });

    return () => {
      channel.stopListening('VoteLockedIn');
    };
  }, [roomId, refreshRoomData]);

  // 2. Derive personal UI state strictly from the database truth
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
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: async (data) => {
      if (data.status === 'success' || data.status === 'failed_final') {
        setFeedback({ type: data.status === 'success' ? 'success' : 'error', message: data.message });
        setTimeout(() => {
          setFeedback(null);
          setLocalVotes({}); 
          refreshRoomData(); 
          
          // Check for either evidence OR level unlocks
          if ((data.unlocked_evidence && data.unlocked_evidence.length > 0) || (data.unlocked_levels && data.unlocked_levels.length > 0)) {
            setTimeout(() => {
              setToastMessage('SYSTEM ALERT: New narrative pathways or evidence recovered.');
              setTimeout(() => setToastMessage(null), 4500);
            }, 500);
          }
        }, 2000);
      } else {
        setFeedback({ type: 'error', message: data.message });
        setLocalVotes({}); 
        refreshRoomData(); 
      }
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const initiatePhaseMutation = useMutation({
    mutationFn: async (levelId: number) => {
      const result = await initiatePhase(roomId, levelId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => refreshRoomData(),
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleSelectChoice = (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => {
    e.stopPropagation(); 
    if (status !== 'active') return; 

    // Instantly snap the UI for the local player, then dispatch to the server
    setLocalVotes(prev => ({ ...prev, [questionId]: choice.id }));
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
    toastMessage, 
    handleSelectChoice,
    handleSubmitTheory,
    initiatePhase: (levelId: number) => initiatePhaseMutation.mutate(levelId),
    clearFeedback
  };
}