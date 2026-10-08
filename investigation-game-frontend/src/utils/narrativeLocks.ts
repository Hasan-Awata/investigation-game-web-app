import type { Choice } from '@/types';
import type { Evidence } from '@/types';

export function checkIsLockedByNarrative(
  choice: Choice,
  accumulatedEvidences: Evidence[],
  votes: { choice_id: number }[]
): boolean {
  if (!choice.requirements) return false;
  const { required_evidence, required_choices } = choice.requirements;
  if (required_evidence && required_evidence.length > 0) {
    const hasAll = required_evidence.every((id: number) =>
      accumulatedEvidences.some(e => e.id === id)
    );
    if (!hasAll) return true;
  }
  if (required_choices && required_choices.length > 0) {
    const hasAll = required_choices.every((id: number) =>
      votes?.some(v => v.choice_id === id)
    );
    if (!hasAll) return true;
  }
  return false;
}