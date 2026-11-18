import type { Character, GameRoom } from '@/types';

export type CharacterPoolId = 'unassigned' | 'guilty';
export type CharacterPoolOrder = Record<CharacterPoolId, readonly number[]>;

export function normalizeCharacterIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is number =>
    typeof id === 'number' && Number.isSafeInteger(id) && id > 0))];
}

export function moveCharacter(order: CharacterPoolOrder, characterId: number, target: CharacterPoolId): CharacterPoolOrder {
  if (!Number.isSafeInteger(characterId) || characterId <= 0) return order;
  const next = {
    guilty: order.guilty.filter(id => id !== characterId),
    unassigned: order.unassigned.filter(id => id !== characterId),
  };
  next[target].push(characterId);
  return next;
}

export function isVerdictReady(room: Pick<GameRoom, 'game_case' | 'completed_levels'>): boolean {
  const completed = new Set(room.completed_levels?.map(level => level.id));
  // Location inspections do not produce completed-level records.
  return (room.game_case?.zones ?? []).every(zone => (zone.levels ?? []).every(level =>
    !level.is_initial || level.presentation_type !== 'interrogation' || completed.has(level.id)));
}

export function groupCharacters(characters: readonly Character[], order: CharacterPoolOrder) {
  const remaining = new Map(characters.map(character => [character.id, character]));
  const takeInOrder = (ids: readonly number[]) => {
    const ordered: Character[] = [];
    for (const id of ids) {
      const character = remaining.get(id);
      if (!character) continue;
      remaining.delete(id);
      ordered.push(character);
    }
    return ordered;
  };

  const guilty = takeInOrder(order.guilty);
  const droppedIntoUnassigned = takeInOrder(order.unassigned);
  return { guilty, unassigned: [...remaining.values(), ...droppedIntoUnassigned] };
}
