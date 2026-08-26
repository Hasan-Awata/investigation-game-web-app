import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { submitInvestigationRequest } from '@/services/api';
import type { GameRoom } from '@/types';
import type { ToastNotification } from './useInvestigationPhase';

export interface FiledRequest {
  id: string;
  type: string;
  timestamp: string;
  evidenceIds: number[];
}

export function useInvestigationRequest(room: GameRoom, refreshRoomData: () => void) {
  const { t } = useTranslation();
  const [trayEvidences, setTrayEvidences] = useState<number[]>([]);
  const [requestType, setRequestType] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Persistent history in sessionStorage for this room
  const historyStorageKey = `room_${room.id}_filed_requests`;
  const [filedRequests, setFiledRequests] = useState<FiledRequest[]>(() => {
    try {
      const saved = sessionStorage.getItem(historyStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const result = await submitInvestigationRequest(room.id, trayEvidences);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message });

      // Save to local filed requests history
      const newRequest: FiledRequest = {
        id: crypto.randomUUID(),
        type: requestType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidenceIds: [...trayEvidences]
      };

      const updatedHistory = [newRequest, ...filedRequests];
      setFiledRequests(updatedHistory);
      sessionStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));

      setTrayEvidences([]);
      setRequestType('');
      refreshRoomData();

      // Trigger respective toast notifications based on what the DA unlocked
      setTimeout(() => {
        const newToasts: ToastNotification[] = [];

        if (data.unlocked_evidence && data.unlocked_evidence.length > 0) {
          newToasts.push({
            id: crypto.randomUUID(),
            type: 'evidence',
            title: t('pages.gameRoom.hooks.request.proceduralApproved'),
            message: t('pages.gameRoom.hooks.request.proceduralApprovedMsg'),
            icon: 'https://api.iconify.design/ph:file-magnifying-glass-duotone.svg?color=%23c48b36'
          });
        }

        if (data.unlocked_levels && data.unlocked_levels.length > 0) {
          newToasts.push({
            id: crypto.randomUUID(),
            type: 'level',
            title: t('pages.gameRoom.hooks.request.warrantExecuted'),
            message: t('pages.gameRoom.hooks.request.warrantExecutedMsg'),
            icon: 'https://api.iconify.design/ph:git-merge-duotone.svg?color=%235a8a9e'
          });
        }

        if (newToasts.length > 0) {
          setToasts(prev => [...prev, ...newToasts]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => !newToasts.some((nt) => nt.id === t.id)));
          }, 5000);
        }
      }, 500);
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
      setTrayEvidences([]);
    }
  });

  const addToTray = (evidenceId: number) => {
    if (!trayEvidences.includes(evidenceId)) {
      setTrayEvidences([...trayEvidences, evidenceId]);
    }
  };

  const removeFromTray = (evidenceId: number) => {
    setTrayEvidences(trayEvidences.filter(id => id !== evidenceId));
  };

  const clearFeedback = () => setFeedback(null);

  return {
    trayEvidences,
    requestType,
    setRequestType,
    addToTray,
    removeFromTray,
    isSubmitting: requestMutation.isPending,
    feedback,
    toasts,
    clearFeedback,
    submitRequest: requestMutation.mutate,
    filedRequests
  };
}