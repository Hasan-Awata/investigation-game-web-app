import type { Character, GameRoom } from '@/types';

export type CharacterPoolId = 'unassigned' | 'guilty';

export function normalizeGuiltyIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is number =>
    typeof id === 'number' && Number.isSafeInteger(id) && id > 0))];
}

export function moveCharacter(ids: readonly number[], characterId: number, target: CharacterPoolId): number[] {
  if (!Number.isSafeInteger(characterId) || characterId <= 0) return [...ids];
  const next = ids.filter(id => id !== characterId);
  if (target === 'guilty') next.push(characterId);
  return next;
}

export function isVerdictReady(room: Pick<GameRoom, 'game_case' | 'completed_levels'>): boolean {
  const completed = new Set(room.completed_levels?.map(level => level.id));
  // Location inspections do not produce completed-level records.
  return (room.game_case?.zones ?? []).every(zone => (zone.levels ?? []).every(level =>
    !level.is_initial || level.presentation_type !== 'interrogation' || completed.has(level.id)));
}

export function groupCharacters(characters: readonly Character[], guiltyIds: readonly number[]) {
  const byId = new Map(characters.map(character => [character.id, character]));
  const selected = new Set(guiltyIds);
  const guilty: Character[] = [];
  for (const id of selected) {
    const character = byId.get(id);
    if (character) guilty.push(character);
  }
  return { guilty, unassigned: characters.filter(character => !selected.has(character.id)) };
}
