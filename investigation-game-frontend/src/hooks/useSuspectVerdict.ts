import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { submitSuspectVerdict } from '@/services/api';
import type { GameRoom } from '@/types';

export function useSuspectVerdict(room: GameRoom, refreshRoomData: () => void, setGameOverData: any) {
  const [guiltyIds, setGuiltyIds] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem(`room_${room.invite_code}_guilty_characters`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const verdictMutation = useMutation({
    mutationFn: async (submittedGuiltyIds: number[]) => {
      const result = await submitSuspectVerdict(room.id, submittedGuiltyIds);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: (data) => {
      if (data.status === 'failed') {
        setFeedback({ type: 'error', message: data.message });
        refreshRoomData();
      } else {
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes(`room_${room.invite_code}`) || key.includes(`room_${room.id}`)) {
            sessionStorage.removeItem(key);
          }
        });
        setGameOverData(data.message, data.stats);
        refreshRoomData();
      }
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleCharacterDrop = (characterId: number, targetPool: 'guilty' | 'unassigned') => {
    let nextGuilty = guiltyIds.filter(id => id !== characterId);
    if (targetPool === 'guilty') nextGuilty.push(characterId);
    
    setGuiltyIds(nextGuilty);
    sessionStorage.setItem(`room_${room.invite_code}_guilty_characters`, JSON.stringify(nextGuilty));
  };

  const clearFeedback = () => {
    setFeedback(null);
    refreshRoomData();
  };

  return {
    guiltyIds,
    feedback,
    isSubmitting: verdictMutation.isPending,
    handleCharacterDrop,
    submitVerdict: () => verdictMutation.mutate(guiltyIds),
    clearFeedback
  };
}