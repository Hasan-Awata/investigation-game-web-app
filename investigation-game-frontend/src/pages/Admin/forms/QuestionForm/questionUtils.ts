// FILE: src/pages/Admin/forms/QuestionForm/questionUtils.ts

export interface ChoiceOutcomes {
  feedback: string;
  next_question_id: string;
  gives_strike: boolean;
  unlock_evidence: string[];
  unlock_levels: string[];
  unlock_suspects: string[];
  unlock_victims: string[];
}

export interface ChoiceRequirements {
  required_evidence: string[];
  required_choices: string[];
}

export interface ChoiceState {
  id: string; 
  text: string;
  outcomes: ChoiceOutcomes; 
  requirements: ChoiceRequirements; 
}

export const defaultRequirements = (): ChoiceRequirements => ({ required_evidence: [], required_choices: [] });

export const defaultOutcomes = (): ChoiceOutcomes => ({
  feedback: '', next_question_id: '', gives_strike: false,
  unlock_evidence: [], unlock_levels: [], unlock_suspects: [], unlock_victims: [],
});

const appendToFormData = (fd: FormData, rootKey: string, obj: any) => {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
      obj.forEach((val, i) => appendToFormData(fd, `${rootKey}[${i}]`, val));
  } else if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => appendToFormData(fd, `${rootKey}[${key}]`, obj[key]));
  } else {
      fd.append(rootKey, obj.toString());
  }
};

export const appendChoicesToFormData = (formData: FormData, choices: ChoiceState[]) => {
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    formData.append(`choices[${i}][text]`, choice.text);
    
    const cleanReqs: any = {};
    if (choice.requirements.required_evidence.length > 0) cleanReqs.required_evidence = choice.requirements.required_evidence.map(Number);
    if (choice.requirements.required_choices.length > 0) cleanReqs.required_choices = choice.requirements.required_choices.map(Number);
    if (Object.keys(cleanReqs).length > 0) appendToFormData(formData, `choices[${i}][requirements]`, cleanReqs);

    const cleanOutcomes: any = {};
    if (choice.outcomes.gives_strike) cleanOutcomes.gives_strike = true;
    if (choice.outcomes.feedback.trim()) cleanOutcomes.feedback = choice.outcomes.feedback.trim();
    if (choice.outcomes.next_question_id.trim()) cleanOutcomes.next_question_id = parseInt(choice.outcomes.next_question_id, 10);
    if (choice.outcomes.unlock_evidence.length > 0) cleanOutcomes.unlock_evidence = choice.outcomes.unlock_evidence.map(Number);
    if (choice.outcomes.unlock_levels.length > 0) cleanOutcomes.unlock_levels = choice.outcomes.unlock_levels.map(Number);
    if (choice.outcomes.unlock_suspects.length > 0) cleanOutcomes.unlock_suspects = choice.outcomes.unlock_suspects.map(Number);
    if (choice.outcomes.unlock_victims.length > 0) cleanOutcomes.unlock_victims = choice.outcomes.unlock_victims.map(Number);
    if (Object.keys(cleanOutcomes).length > 0) appendToFormData(formData, `choices[${i}][outcomes]`, cleanOutcomes);
  }
};