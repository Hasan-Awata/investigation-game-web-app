import type { Level, Question, RoomInspection } from '@/types';

export function getOpenLocationQuestions(
  questions: readonly Question[],
  inspections: readonly RoomInspection[],
): Question[] {
  const successfulIds = new Set(inspections.filter(item => !item.is_dead_end).map(item => item.choice_id));
  const linkedIds = new Set<number>();
  const openedIds = new Set<number>();

  for (const question of questions) {
    for (const choice of question.choices ?? []) {
      const nextId = choice.next_question_id ?? choice.outcomes?.next_question_id;
      if (!nextId) continue;
      linkedIds.add(Number(nextId));
      if (successfulIds.has(choice.id)) openedIds.add(Number(nextId));
    }
  }

  return questions.filter(question => !linkedIds.has(question.id) || openedIds.has(question.id));
}

export function isLocationLevelInspected(level: Level, inspections: readonly RoomInspection[]): boolean {
  const openQuestions = getOpenLocationQuestions(level.questions ?? [], inspections);
  if (openQuestions.length === 0) return false;

  const inspectedIds = new Set(inspections.map(item => item.choice_id));
  return openQuestions.every(question => question.choices?.some(choice => inspectedIds.has(choice.id)) === true);
}
