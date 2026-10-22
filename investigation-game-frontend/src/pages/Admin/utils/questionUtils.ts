import type { DraftChoice } from '@/pages/Admin/forms/Shared/ChoiceEditorCard';
import { formatCoordinateText } from '@/pages/Admin/utils/coordinates';
import { serializeFormData } from '@/pages/Admin/utils/serializeFormData';

export interface ChoiceOutcomes {
  feedback: string;
  next_question_id: number | null;
  gives_strike: boolean;
  unlock_evidence: number[];
  unlock_levels: number[];
  character_updates: { id: number; is_unlocked?: boolean; status?: string }[];
}

export interface ChoiceRequirements {
  required_evidence: number[];
  required_choices: number[];
}

export const defaultRequirements = (): ChoiceRequirements => ({ required_evidence: [], required_choices: [] });

export const defaultOutcomes = (): ChoiceOutcomes => ({
  feedback: '', next_question_id: null, gives_strike: false,
  unlock_evidence: [], unlock_levels: [], character_updates: [],
});

type ChoiceRequirementsDraft = NonNullable<DraftChoice['requirements']>;
type ChoiceOutcomesDraft = NonNullable<DraftChoice['outcomes']>;

const normalizeRequirements = (requirements?: DraftChoice['requirements']): ChoiceRequirementsDraft | undefined => {
  const clean: ChoiceRequirementsDraft = {};
  if (Array.isArray(requirements?.required_evidence) && requirements.required_evidence.length > 0) {
    clean.required_evidence = requirements.required_evidence.map(Number);
  }
  if (Array.isArray(requirements?.required_choices) && requirements.required_choices.length > 0) {
    clean.required_choices = requirements.required_choices.map(Number);
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
};

const normalizeOutcomes = (outcomes?: DraftChoice['outcomes']): ChoiceOutcomesDraft | undefined => {
  if (!outcomes) return undefined;
  const clean: ChoiceOutcomesDraft = {};
  if (outcomes.gives_strike) clean.gives_strike = true;
  const feedback = outcomes.feedback?.trim();
  if (feedback) clean.feedback = feedback;
  if (outcomes.next_question_id) clean.next_question_id = Number(outcomes.next_question_id);
  if (Array.isArray(outcomes.unlock_evidence) && outcomes.unlock_evidence.length > 0) {
    clean.unlock_evidence = outcomes.unlock_evidence.map(Number);
  }
  if (Array.isArray(outcomes.unlock_levels) && outcomes.unlock_levels.length > 0) {
    clean.unlock_levels = outcomes.unlock_levels.map(Number);
  }
  if (Array.isArray(outcomes.character_updates) && outcomes.character_updates.length > 0) {
    clean.character_updates = outcomes.character_updates;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
};

/**
 * Prepares choices for the wire: drops empty sub-objects and trims/omits
 * values the backend stores verbatim (an empty `feedback` would shadow the
 * default hint, `gives_strike: false` would arrive as the truthy `'0'`).
 *
 * Client-side identities (`crypto.randomUUID()` on unsaved choices) are
 * stripped: `choices.*.id` must be an integer, and omitting the id is how
 * `AdminQuestionController::syncChoices` learns a choice is new.
 */
export const normalizeChoices = (choices: DraftChoice[]): DraftChoice[] =>
  choices.map((choice) => {
    // The wire has no coordinate field: it travels inside `text`. When the
    // author plotted a point we encode the structured metadata; otherwise the
    // text is left untouched (an interrogation line may contain a comma/pipe).
    const normalized: DraftChoice = {
      text: choice.coordinate ? formatCoordinateText(choice.coordinate) : String(choice.text ?? ''),
    };

    const rawId = choice.id === undefined || choice.id === null ? '' : String(choice.id).trim();
    if (/^\d+$/.test(rawId)) normalized.id = Number(rawId);

    const requirements = normalizeRequirements(choice.requirements);
    if (requirements) normalized.requirements = requirements;

    const outcomes = normalizeOutcomes(choice.outcomes);
    if (outcomes) normalized.outcomes = outcomes;

    return normalized;
  });

interface NodePayload {
  level_id: string;
  text: string;
  store_locally: boolean;
  choices: DraftChoice[];
  image?: File | null;
}

export const buildNodeFormData = (payload: NodePayload): FormData =>
  serializeFormData({
    level_id: payload.level_id,
    text: payload.text,
    store_locally: payload.store_locally,
    image: payload.image ?? null,
    choices: normalizeChoices(payload.choices),
  });

export interface BaseNodeFormProps {
  state: { editingId: number | null; text: string; storeLocally: boolean; choices: DraftChoice[] };
  setters: { setText: (t: string) => void; setStoreLocally: (v: boolean) => void; setChoices: (c: DraftChoice[]) => void };
  actions: { registerFileRef: (key: string) => (el: HTMLInputElement | null) => void; handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void; handleCancel: () => void };
  status: { isProcessing: boolean }; 
  previews: { image?: string | null };
}
