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

export function useInvestigationPhase(room: GameRoom, refreshRoomData: () => void) {
  const [localVotes, setLocalVotes] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  // Track wiretaps triggered by this specific client to prevent WebSocket echo
  const locallyTriggered = useRef<Set<number>>(new Set());

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

  useEffect(() => {
    if (!window.Echo) return;
    const channel = window.Echo.private(`room.${roomId}`);
    
    channel.listen('VoteLockedIn', () => {
      refreshRoomData();
    });

    channel.listen('WiretapTriggered', (e: any) => {
      // Only play the audio if it wasn't triggered locally
      if (e.audio_url && !locallyTriggered.current.has(e.question_id)) {
        const audio = new Audio(e.audio_url);
        audio.play().catch(err => console.error('Browser blocked autoplay:', err));
      }

      const newToast: ToastNotification = {
        id: crypto.randomUUID(), type: 'evidence', title: 'WIRETAP INTERCEPTED', message: e.message || 'Audio feed active. Listen carefully.',
        icon: 'https://api.iconify.design/ph:waveform-duotone.svg?color=%23c48b36'
      };
      
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToast.id)), 5000);

      refreshRoomData();
    });

    return () => {
      channel.stopListening('VoteLockedIn');
      channel.stopListening('WiretapTriggered'); 
    };
  }, [roomId, refreshRoomData]);

  const voteMutation = useMutation({
    mutationFn: async ({ questionId, choiceId }: { questionId: number, choiceId: number }) => {
      const result = await lockVote(roomId, questionId, choiceId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: (data) => {
      refreshRoomData();
      
      if (data.unlocked_evidence?.length || data.unlocked_levels?.length || data.unlocked_suspects?.length || data.unlocked_victims?.length) {
        setTimeout(() => {
          const newToasts: ToastNotification[] = [];
          
          if (data.unlocked_evidence && data.unlocked_evidence.length > 0) {
            newToasts.push({ 
              id: crypto.randomUUID(), type: 'evidence', title: 'EVIDENCE RECOVERED', message: `${data.unlocked_evidence.length} new piece(s) of physical evidence secured.`, 
              icon: 'https://api.iconify.design/ph:file-magnifying-glass-duotone.svg?color=%23c48b36' 
            });
          }
          if (data.unlocked_levels && data.unlocked_levels.length > 0) {
            newToasts.push({ 
              id: crypto.randomUUID(), type: 'level', title: 'PHASE UNLOCKED', message: 'A new narrative path is now available.', 
              icon: 'https://api.iconify.design/ph:git-merge-duotone.svg?color=%235a8a9e' 
            });
          }
          if (data.unlocked_suspects && data.unlocked_suspects.length > 0) {
            newToasts.push({ 
              id: crypto.randomUUID(), type: 'suspect', title: 'PERSON OF INTEREST', message: 'New suspect added to the board.', 
              icon: 'https://api.iconify.design/ph:user-focus-duotone.svg?color=%23a33232' 
            });
          }
          if (data.unlocked_victims && data.unlocked_victims.length > 0) {
            newToasts.push({ 
              id: crypto.randomUUID(), type: 'victim', title: 'CASUALTY IDENTIFIED', message: 'New victim details have been verified.', 
              icon: 'https://api.iconify.design/ph:skull-duotone.svg?color=%238a8d91' 
            });
          }

          // Append all generated toasts at once
          setToasts((prev) => [...prev, ...newToasts]);

          // Automatically sweep them off the screen after 5 seconds
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => !newToasts.some((nt) => nt.id === t.id)));
          }, 5000);
        }, 500);
      }
    }
  });

  const submitTheoryMutation = useMutation({
    mutationFn: async () => {
      const result = await submitAssessment(roomId);
      if (!result.isSuccess) throw result.errorMessage;
      return result.value;
    },
    onSuccess: async (data) => {
      if (data.status === 'success' || data.status === 'failed_final') {
        setFeedback({ 
          type: data.status === 'success' ? 'success' : 'error', 
          title: data.status === 'success' ? 'Consensus Verified' : 'Theory Rejected',
          message: data.message 
        });
        
        // Wait for the players to read the feedback before sweeping the board
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
    onError: (error: any) => {
      setFeedback({ type: 'error', title: error.title || 'Error', message: error.message });
    }
  });

  const initiatePhaseMutation = useMutation({
    mutationFn: async (levelId: number) => {
      const result = await initiatePhase(roomId, levelId);
      // Throw the object directly so onError can catch it
      if (!result.isSuccess) throw result.errorMessage; 
      return result.value;
    },
    onSuccess: () => refreshRoomData(),
    onError: (error: any) => setFeedback({ 
      type: 'error', 
      title: error.title || 'System Error', 
      message: error.message 
    })
  });

  const triggerWiretapMutation = useMutation({
    mutationFn: async ({ questionId, audioUrl }: { questionId: number, audioUrl: string }) => {
      locallyTriggered.current.add(questionId); // Mark as triggered by this client
      const result = await triggerWiretap(roomId, questionId);
      
      // Throw the error object directly
      if (!result.isSuccess) throw result.errorMessage; 
      
      return { value: result.value, audioUrl };
    },
    onSuccess: (data) => {
      // Guarantee playback for the Host immediately within the trusted user-gesture chain
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.play().catch(err => console.error('Audio playback failed:', err));
      }
      refreshRoomData(); // Guarantee the UI updates to the "Severed" state
    },
    onError: (error: any) => setFeedback({ 
      type: 'error', 
      title: error.title || 'Transmission Error', 
      message: error.message 
    })
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
    toasts, 
    handleSelectChoice,
    handleSubmitTheory,
    initiatePhase: (levelId: number) => initiatePhaseMutation.mutate(levelId),
    clearFeedback,
    triggerWiretap: (questionId: number, audioUrl: string) => triggerWiretapMutation.mutate({ questionId, audioUrl }), 
    isTriggeringWiretap: triggerWiretapMutation.isPending 
  };
}