import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Choice } from '@/types';
import { lockVote, submitAssessment, triggerPersonaHint } from '@/services/api';

export function useInvestigationPhase(roomId: number, refreshRoomData: () => void) {
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Dedicated state for non-blocking notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mutation for voting
  const voteMutation = useMutation({
    mutationFn: async ({ questionId, choiceId }: { questionId: number, choiceId: number }) => {
      const result = await lockVote(roomId, questionId, choiceId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  // Mutation for submitting the theory
  const submitTheoryMutation = useMutation({
    mutationFn: async () => {
      const result = await submitAssessment(roomId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: async (data) => {
      if (data.status === 'success') {
        // 1. Show the success modal immediately
        setFeedback({ type: 'success', message: 'Verdict accepted. Advancing to the next phase.' });
        
        setTimeout(() => {
          // 2. Clear the modal and advance the level
          setFeedback(null);
          setVotes({}); 
          refreshRoomData(); 
          
          // 3. Trigger the TOAST notification instead of a modal
          if (data.unlocked_evidence && data.unlocked_evidence.length > 0) {
            setTimeout(() => {
              setToastMessage('SYSTEM ALERT: New evidence recovered based on your narrative deductions.');
              
              // Auto-dismiss the toast after 4.5 seconds
              setTimeout(() => setToastMessage(null), 4500);
            }, 500);
          }
        }, 2000);
      } else {
        const hintResult = await triggerPersonaHint(roomId);
        if (hintResult.isSuccess) {
          setFeedback({ type: 'error', message: hintResult.value.hint });
        } else {
          setFeedback({ type: 'error', message: 'The logic is flawed. Review the evidence.' });
        }
      }
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleSelectChoice = (e: React.MouseEvent, questionId: number, choice: Choice, status: string) => {
    e.stopPropagation(); 
    if (status !== 'active') return; 

    setVotes(prev => ({ ...prev, [questionId]: choice.id }));
    voteMutation.mutate({ questionId, choiceId: choice.id }); // Fire and forget
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
    votes,
    isSubmitting: submitTheoryMutation.isPending,
    feedback,
    toastMessage, // Expose the toast state to the component
    handleSelectChoice,
    handleSubmitTheory,
    clearFeedback
  };
}