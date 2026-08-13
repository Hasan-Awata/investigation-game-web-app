import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '@/services/adminApi';

export type AdminEntityType = 
  | 'case' 
  | 'phase' 
  | 'level' 
  | 'question' 
  | 'evidence' 
  | 'request' 
  | 'suspect' 
  | 'victim';

export function useAdminMutations(entityType: AdminEntityType) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const clearFeedback = () => setFeedback(null);

  // Map the entity type to the exact API service functions from adminApi
  const apiMap = {
    'case': { create: adminApi.createAdminCase, update: adminApi.updateAdminCase, del: adminApi.deleteAdminCase, name: 'Case' },
    'phase': { create: adminApi.createAdminPhase, update: adminApi.updateAdminPhase, del: adminApi.deleteAdminPhase, name: 'Phase' },
    'level': { create: adminApi.createAdminLevel, update: adminApi.updateAdminLevel, del: adminApi.deleteAdminLevel, name: 'Level' },
    'question': { create: adminApi.createAdminQuestion, update: adminApi.updateAdminQuestion, del: adminApi.deleteAdminQuestion, name: 'Node' },
    'evidence': { create: adminApi.createAdminEvidence, update: adminApi.updateAdminEvidence, del: adminApi.deleteAdminEvidence, name: 'Evidence' },
    'request': { create: adminApi.createAdminInvestigationRequest, update: adminApi.updateAdminInvestigationRequest, del: adminApi.deleteAdminInvestigationRequest, name: 'Request protocol' },
    'suspect': { create: adminApi.createAdminSuspect, update: adminApi.updateAdminSuspect, del: adminApi.deleteAdminSuspect, name: 'Suspect' },
    'victim': { create: adminApi.createAdminVictim, update: adminApi.updateAdminVictim, del: adminApi.deleteAdminVictim, name: 'Victim' },
  };

  const methods = apiMap[entityType];

  const handleSuccess = (action: string) => {
    setFeedback({ type: 'success', message: `${methods.name} successfully ${action}.` });
    // This instantly refreshes the data in useAdminData across the whole app
    queryClient.invalidateQueries({ queryKey: ['adminCases'] });
  };

  const handleError = (error: Error) => {
    setFeedback({ type: 'error', message: error.message });
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await methods.create(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => handleSuccess('created'),
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await methods.update(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => handleSuccess('updated'),
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await methods.del(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => handleSuccess('deleted'),
    onError: handleError,
  });

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return {
    createEntity: createMutation.mutate,
    updateEntity: updateMutation.mutate,
    deleteEntity: deleteMutation.mutate,
    isProcessing,
    feedback,
    setFeedback, 
    clearFeedback
  };
}