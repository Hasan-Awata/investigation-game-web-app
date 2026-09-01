import { useAdminForm } from './useAdminForm';
import toast from 'react-hot-toast';
import type { AdminEntityType } from './useAdminMutations';

interface UseValidatedFormProps<T> {
  entityType: AdminEntityType;
  initialState: T;
  basePayload?: Record<string, any>;
  validator?: (data: T) => string | null; // Returns error message or null if valid
}

export function useValidatedForm<T extends Record<string, any>>({ 
  entityType, initialState, basePayload, validator 
}: UseValidatedFormProps<T>) {
  
  const formManager = useAdminForm<T>({ entityType, initialState, basePayload });

  const handleValidatedSubmit = (
    e: React.FormEvent<HTMLFormElement>, 
    files?: Record<string, File | null>
  ) => {
    e.preventDefault();
    
    if (validator) {
      const error = validator(formManager.formData);
      if (error) {
        toast.error(error);
        return;
      }
    }
    
    formManager.handleSubmit(e, files);
  };

  return {
    ...formManager,
    handleValidatedSubmit
  };
}