import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';

export interface ChoiceOutcomes {
  feedback: string;
  next_question_id: number | null;
  gives_strike: boolean;
  unlock_evidence: number[];
  unlock_levels: number[];
  unlock_suspects: number[];
  unlock_victims: number[];
}

export interface ChoiceRequirements {
  required_evidence: number[];
  required_choices: number[];
}

export const defaultRequirements = (): ChoiceRequirements => ({ required_evidence: [], required_choices: [] });

export const defaultOutcomes = (): ChoiceOutcomes => ({
  feedback: '', next_question_id: null, gives_strike: false,
  unlock_evidence: [], unlock_levels: [], unlock_suspects: [], unlock_victims: [],
});

const appendToFormData = (fd: FormData, rootKey: string, obj: any) => {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
      obj.forEach((val, i) => appendToFormData(fd, `${rootKey}[${i}]`, val));
  } else if (typeof obj === 'object' && !(obj instanceof File)) {
      Object.keys(obj).forEach(key => appendToFormData(fd, `${rootKey}[${key}]`, obj[key]));
  } else {
      fd.append(rootKey, obj instanceof File ? obj : obj.toString());
  }
};

export const appendChoicesToFormData = (formData: FormData, choices: any[]) => {
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    formData.append(`choices[${i}][text]`, choice.text);
    
    const cleanReqs: any = {};
    if (choice.requirements?.required_evidence?.length > 0) cleanReqs.required_evidence = choice.requirements.required_evidence.map(Number);
    if (choice.requirements?.required_choices?.length > 0) cleanReqs.required_choices = choice.requirements.required_choices.map(Number);
    if (Object.keys(cleanReqs).length > 0) appendToFormData(formData, `choices[${i}][requirements]`, cleanReqs);

    const cleanOutcomes: any = {};
    if (choice.outcomes?.gives_strike) cleanOutcomes.gives_strike = true;
    if (choice.outcomes?.feedback?.trim()) cleanOutcomes.feedback = choice.outcomes.feedback.trim();
    if (choice.outcomes?.next_question_id) cleanOutcomes.next_question_id = Number(choice.outcomes.next_question_id);
    if (choice.outcomes?.unlock_evidence?.length > 0) cleanOutcomes.unlock_evidence = choice.outcomes.unlock_evidence.map(Number);
    if (choice.outcomes?.unlock_levels?.length > 0) cleanOutcomes.unlock_levels = choice.outcomes.unlock_levels.map(Number);
    if (choice.outcomes?.unlock_suspects?.length > 0) cleanOutcomes.unlock_suspects = choice.outcomes.unlock_suspects.map(Number);
    if (choice.outcomes?.unlock_victims?.length > 0) cleanOutcomes.unlock_victims = choice.outcomes.unlock_victims.map(Number);
    if (Object.keys(cleanOutcomes).length > 0) appendToFormData(formData, `choices[${i}][outcomes]`, cleanOutcomes);
  }
};

interface NodePayload {
  level_id: string;
  text: string;
  store_locally: boolean;
  choices: any[];
  image?: File | null;
  audio?: File | null;
}

export const buildNodeFormData = (payload: NodePayload): FormData => {
  const formData = new FormData();
  formData.append('level_id', payload.level_id);
  formData.append('text', payload.text);
  formData.append('store_locally', payload.store_locally ? '1' : '0');
  
  if (payload.image) formData.append('image', payload.image);
  if (payload.audio) formData.append('audio', payload.audio);

  appendChoicesToFormData(formData, payload.choices);

  return formData;
};

export interface BaseNodeFormProps {
  state: { editingId: number | null; text: string; storeLocally: boolean; choices: DraftChoice[] };
  setters: { setText: (t: string) => void; setStoreLocally: (v: boolean) => void; setChoices: (c: DraftChoice[]) => void };
  actions: { registerFileRef: (key: string) => any; handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void; handleCancel: () => void };
  status: { isProcessing: boolean }; 
  previews: { image?: string | null; audio?: string | null };
}