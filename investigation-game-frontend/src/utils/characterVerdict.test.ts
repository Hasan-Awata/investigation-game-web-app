import { expect, it } from 'vitest';
import type { Character, GameCase, Level } from '@/types';
import { groupCharacters, isVerdictReady, moveCharacter, normalizeGuiltyIds } from './characterVerdict';

it.each([null, {}, '1,2', [null, '2', 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]])(
  'rejects invalid stored selections: %j', value => expect(normalizeGuiltyIds(value)).toEqual([]),
);

it('normalizes stored IDs without coercion, mutation, or reordering', () => {
  const stored = Object.freeze([3, '2', 1, 3, 2, null]);
  expect(normalizeGuiltyIds(stored)).toEqual([3, 1, 2]);
});

it('preserves drop ordering and removes all occurrences without mutating input', () => {
  const ids = Object.freeze([1, 2, 1]);
  expect(moveCharacter(ids, 1, 'guilty')).toEqual([2, 1]);
  expect(moveCharacter(ids, 1, 'unassigned')).toEqual([2]);
  expect(moveCharacter(ids, -1, 'guilty')).toEqual(ids);
});

it('groups once in selection order and source order, skipping unknown or duplicate selections', () => {
  const characters = Object.freeze([1, 2, 3, 4].map(id => ({ id, name: String(id) } as Character)));
  const result = groupCharacters(characters, Object.freeze([3, 99, 1, 3]));
  expect(result.guilty).toEqual([characters[2], characters[0]]);
  expect(result.unassigned).toEqual([characters[1], characters[3]]);
  expect(groupCharacters([], [99])).toEqual({ guilty: [], unassigned: [] });
});

it('requires only initial interrogations across every zone', () => {
  const game_case = { zones: [
    { levels: [{ id: 1, is_initial: true, presentation_type: 'location' }] },
    { levels: [
      { id: 2, is_initial: true, presentation_type: 'interrogation' },
      { id: 3, is_initial: false, presentation_type: 'interrogation' },
    ] },
    {},
  ] } as GameCase;
  expect(isVerdictReady({ game_case })).toBe(false);
  expect(isVerdictReady({ game_case, completed_levels: [{ id: 2 }] as Level[] })).toBe(true);
  expect(isVerdictReady({})).toBe(true);
  expect(isVerdictReady({ game_case: { zones: [] } as unknown as GameCase })).toBe(true);
});
