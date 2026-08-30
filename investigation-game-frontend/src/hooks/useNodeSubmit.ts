import { useAdminMutations } from './useAdminMutations';
import { buildNodeFormData } from '@/pages/Admin/forms/Shared/questionUtils';
import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';

interface NodeSubmitPayload {
  nodeId?: number;
  levelId: string;
  text: string;
  choices: DraftChoice[];
  storeLocally?: boolean;
  image?: File | null;
  audio?: File | null;
}

export function useNodeSubmit(onSuccess: () => void) {
  const { createEntity, updateEntity, isProcessing, feedback, setFeedback, clearFeedback } = useAdminMutations('question');

  const submitNode = (payload: NodeSubmitPayload) => {
    clearFeedback();
    
    // Abstracted Validation
    if (!payload.text.trim()) return setFeedback({ type: 'error', message: 'Node text cannot be empty.' });
    if (payload.choices.length > 0 && payload.choices.some(c => !c.text.trim())) {
      return setFeedback({ type: 'error', message: 'All response branches/choices must have text.' });
    }

    // Abstracted Shaping
    const formData = buildNodeFormData({
      level_id: payload.levelId,
      text: payload.text,
      store_locally: payload.storeLocally || false,
      choices: payload.choices,
      image: payload.image,
      audio: payload.audio,
    });

    // Abstracted Execution
    if (payload.nodeId) {
      updateEntity({ id: payload.nodeId, formData }, { onSuccess });
    } else {
      createEntity(formData, { onSuccess });
    }
  };

  return { submitNode, isProcessing, feedback, setFeedback, clearFeedback };
}