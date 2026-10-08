import type { Choice } from '@/types';

export function hasUnlocks(choice: Choice): boolean {
  return !!choice.outcomes && (
    (choice.outcomes.unlock_evidence?.length ?? 0) > 0 ||
    (choice.outcomes.unlock_levels?.length ?? 0) > 0 ||
    (choice.outcomes.unlock_suspects?.length ?? 0) > 0 ||
    (choice.outcomes.unlock_victims?.length ?? 0) > 0 ||
    !!choice.outcomes.next_question_id
  );
}

export const isCorrectFind = (choice: Choice) => hasUnlocks(choice);