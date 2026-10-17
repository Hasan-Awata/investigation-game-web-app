import type { Choice } from '@/types';

/**
 * Player-side heuristic for whether a choice leads somewhere.
 *
 * `outcomes` is stripped from player payloads (it is the answer key), so the
 * only narrative signal a client can see is the top-level `next_question_id`
 * hydrated by the backend. Whether a point is a true "find" is decided
 * server-side on the inspection record.
 */
export function hasUnlocks(choice: Choice): boolean {
  return choice.next_question_id != null;
}

export const isCorrectFind = (choice: Choice) => hasUnlocks(choice);
