import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '@/services/adminApi';

export type AdminEntityType =
  | 'case'
  | 'zone'
  | 'level'
  | 'question'
  | 'evidence'
  | 'request'
  | 'character';

interface ApiMethods {
  create: (fd: FormData) => Promise<any>;
  update: (id: number, fd: FormData) => Promise<any>;
  del: (id: number) => Promise<any>;
  import?: (payload: any) => Promise<any>;
  name: string;
}

export function useAdminMutations(entityType: AdminEntityType) {
  const queryClient = useQueryClient();

  const apiMap: Record<AdminEntityType, ApiMethods> = {
    'case': { create: adminApi.createAdminCase, update: adminApi.updateAdminCase, del: adminApi.deleteAdminCase, import: adminApi.importAdminCase, name: 'Case' },
    'zone': { create: adminApi.createAdminZone, update: adminApi.updateAdminZone, del: adminApi.deleteAdminZone, name: 'Zone' },
    'level': { create: adminApi.createAdminLevel, update: adminApi.updateAdminLevel, del: adminApi.deleteAdminLevel, name: 'Level' },
    'question': { create: adminApi.createAdminQuestion, update: adminApi.updateAdminQuestion, del: adminApi.deleteAdminQuestion, name: 'Node' },
    'evidence': { create: adminApi.createAdminEvidence, update: adminApi.updateAdminEvidence, del: adminApi.deleteAdminEvidence, name: 'Evidence' },
    'request': { create: adminApi.createAdminInvestigationRequest, update: adminApi.updateAdminInvestigationRequest, del: adminApi.deleteAdminInvestigationRequest, name: 'Request protocol' },
    'character': { create: adminApi.createAdminCharacter, update: adminApi.updateAdminCharacter, del: adminApi.deleteAdminCharacter, name: 'Character' },
  };

  const methods = apiMap[entityType];

  const handleSuccess = (action: string) => {
    toast.success(`${methods.name} successfully ${action}.`);
    
    // Always refresh the master case list (handles base stats, character arrays, etc.)
    queryClient.invalidateQueries({ queryKey: ['adminCases'] });

    // Only refresh the narrative hierarchy if a structural element was altered
    if (['zone', 'level', 'question'].includes(entityType)) {
      queryClient.invalidateQueries({ queryKey: ['adminZones'] });
      queryClient.invalidateQueries({ queryKey: ['adminLevels'] });
    }
  };

  const handleError = (error: Error) => {
    toast.error(error.message);
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

  const importMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!methods.import) throw new Error(`Bulk import is not supported for ${methods.name}.`);
      const result = await methods.import(payload);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => handleSuccess('imported successfully via transaction'),
    onError: handleError,
  });

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || importMutation.isPending;

  return {
    createEntity: createMutation.mutate,
    updateEntity: updateMutation.mutate,
    deleteEntity: deleteMutation.mutate,
    importEntity: importMutation.mutate,
    isProcessing
  };
}