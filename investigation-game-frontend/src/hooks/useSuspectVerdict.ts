import { useState } from 'react';
import { submitSuspectVerdict } from '@/services/api';
import { getSafeStorage, setSafeStorage, clearRoomSessionData } from '@/utils/storage';
import { useGameMutation } from './useGameMutation';
import type { GameRoom } from '@/types';

export function useSuspectVerdict(room: GameRoom, refreshRoomData: () => void, setGameOverData: any) {
  const guiltyStorageKey = `room_${room.invite_code}_guilty_characters`;

  const [guiltyIds, setGuiltyIds] = useState<number[]>(() =>
    getSafeStorage<number[]>('session', guiltyStorageKey, [])
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const verdictMutation = useGameMutation<{ status: string; message: string; stats?: unknown }, number[]>({
    mutationFn: (submittedGuiltyIds) => submitSuspectVerdict(room.id, submittedGuiltyIds),
    // The Characters tab renders its own indictment modal, so the global
    // overlay would just duplicate it.
    dispatchErrorFeedback: false,
    onSuccess: (data) => {
      if (data.status === 'failed') {
        setFeedback({ type: 'error', message: data.message });
        refreshRoomData();
      } else {
        clearRoomSessionData(room.id, room.invite_code);
        setGameOverData(data.message, data.stats);
        refreshRoomData();
      }
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleCharacterDrop = (characterId: number, targetPool: 'guilty' | 'unassigned') => {
    let nextGuilty = guiltyIds.filter(id => id !== characterId);
    if (targetPool === 'guilty') nextGuilty.push(characterId);

    setGuiltyIds(nextGuilty);
    setSafeStorage('session', guiltyStorageKey, nextGuilty);
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
