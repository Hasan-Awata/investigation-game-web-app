import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { submitInvestigationRequest } from '@/services/api';
import { useGameMutation } from './useGameMutation';
import type { GameRoom } from '@/types';
import type { FiledRequest } from '@/types';
import { useRoomUI } from '@/context/RoomContext.shared';

interface RequestRollback {
  previousRoom: unknown;
}

export function useInvestigationRequest(room: GameRoom, refreshRoomData: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addGlobalToast } = useRoomUI();
  
  const [trayEvidences, setTrayEvidences] = useState<number[]>([]);
  const [trayCharacters, setTrayCharacters] = useState<number[]>([]);
  const [requestType, setRequestType] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Derived directly from the authoritative room payload
  const filedRequests: FiledRequest[] = room.filed_requests || [];

  const requestMutation = useGameMutation<
    { status: string; message: string; unlocked_evidence: number[]; unlocked_levels?: number[] },
    void,
    RequestRollback
  >({
    mutationFn: () => submitInvestigationRequest(room.id, { evidenceIds: trayEvidences, characterIds: trayCharacters }),
    // GameRoomLayout renders the request verdict in its own modal.
    dispatchErrorFeedback: false,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['gameRoom', room.invite_code] });
      const previousRoom = queryClient.getQueryData(['gameRoom', room.invite_code]);

      const optimisticRequest: FiledRequest = {
        id: `temp-${Date.now()}`,
        request_type: requestType,
        created_at: new Date().toISOString(),
        evidence_ids: [...trayEvidences],
        character_ids: [...trayCharacters]
      };

      queryClient.setQueryData(['gameRoom', room.invite_code], (old: GameRoom | undefined) => {
        if (!old) return old;
        return {
          ...old,
          filed_requests: [optimisticRequest, ...(old.filed_requests || [])]
        };
      });

      return { previousRoom };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(['gameRoom', room.invite_code], context?.previousRoom);
      setFeedback({ type: 'error', message: error.message });
      setTrayEvidences([]);
      setTrayCharacters([]);
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message });
      setTrayEvidences([]);
      setTrayCharacters([]);
      setRequestType('');
      refreshRoomData();

      // Trigger respective toast notifications based on what the DA unlocked
      setTimeout(() => {
        if (data.unlocked_evidence && data.unlocked_evidence.length > 0) {
          addGlobalToast({
            type: 'evidence',
            title: t('pages.gameRoom.hooks.request.proceduralApproved'),
            message: t('pages.gameRoom.hooks.request.proceduralApprovedMsg'),
            icon: 'https://api.iconify.design/ph:file-magnifying-glass-duotone.svg?color=%23c48b36'
          });
        }

        if (data.unlocked_levels && data.unlocked_levels.length > 0) {
          addGlobalToast({
            type: 'level',
            title: t('pages.gameRoom.hooks.request.warrantExecuted'),
            message: t('pages.gameRoom.hooks.request.warrantExecutedMsg'),
            icon: 'https://api.iconify.design/ph:git-merge-duotone.svg?color=%235a8a9e'
          });
        }
      }, 500);
    }
  });

  const addEvidenceToTray = (evidenceId: number) => {
    if (!trayEvidences.includes(evidenceId)) {
      setTrayEvidences([...trayEvidences, evidenceId]);
    }
  };

  const addCharacterToTray = (characterId: number) => {
    if (!trayCharacters.includes(characterId)) {
      setTrayCharacters([...trayCharacters, characterId]);
    }
  };

  const removeItem = (id: number, type: 'evidence' | 'character') => {
    if (type === 'evidence') {
      setTrayEvidences(prev => prev.filter(itemId => itemId !== id));
    } else {
      setTrayCharacters(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const clearFeedback = () => setFeedback(null);

  return {
    trayEvidences,
    trayCharacters,
    requestType,
    setRequestType,
    addEvidenceToTray,
    addCharacterToTray,
    removeItem,
    isSubmitting: requestMutation.isPending,
    feedback,
    clearFeedback,
    submitRequest: requestMutation.mutate,
    filedRequests
  };
}