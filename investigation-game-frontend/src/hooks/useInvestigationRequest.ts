import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { submitInvestigationRequest } from '@/services/api';
import type { GameRoom } from '@/types';
import type { ToastNotification } from './useInvestigationPhase';

export function useInvestigationRequest(room: GameRoom, refreshRoomData: () => void) {
  const [trayEvidences, setTrayEvidences] = useState<number[]>([]);
  const [requestType, setRequestType] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const requestMutation = useMutation({
    mutationFn: async () => {
      const result = await submitInvestigationRequest(room.id, trayEvidences);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message });
      setTrayEvidences([]);
      setRequestType('');
      refreshRoomData();

      // Dispatch a tactical toast notification
      if (data.unlocked_evidence && data.unlocked_evidence.length > 0) {
        setTimeout(() => {
          const newToast: ToastNotification = { 
            id: crypto.randomUUID(), 
            type: 'evidence', 
            title: 'PROCEDURAL REQUEST APPROVED', 
            message: 'New case files have been authorized and added to the board.', 
            icon: 'https://api.iconify.design/ph:file-magnifying-glass-duotone.svg?color=%23c48b36' 
          };
          setToasts(prev => [...prev, newToast]);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToast.id)), 5000);
        }, 500);
      }
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
    submitRequest: requestMutation.mutate
  };
}