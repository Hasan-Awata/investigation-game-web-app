import { expect, it } from 'vitest';
import type { Character, GameCase, Level } from '@/types';
import { groupCharacters, isVerdictReady, moveCharacter, normalizeCharacterIds } from './characterVerdict';

it.each([null, {}, '1,2', [null, '2', 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]])(
  'rejects invalid stored selections: %j', value => expect(normalizeCharacterIds(value)).toEqual([]),
);

it('normalizes stored IDs without coercion, mutation, or reordering', () => {
  const stored = Object.freeze([3, '2', 1, 3, 2, null]);
  expect(normalizeCharacterIds(stored)).toEqual([3, 1, 2]);
});

it('appends to either destination and removes previous occurrences without mutating input', () => {
  const order = { guilty: Object.freeze([1, 2, 1]), unassigned: Object.freeze([3, 4]) };
  expect(moveCharacter(order, 1, 'guilty')).toEqual({ guilty: [2, 1], unassigned: [3, 4] });
  expect(moveCharacter(order, 3, 'unassigned')).toEqual({ guilty: [1, 2, 1], unassigned: [4, 3] });
  expect(moveCharacter(order, 1, 'unassigned')).toEqual({ guilty: [2], unassigned: [3, 4, 1] });
  expect(moveCharacter(order, 3, 'guilty')).toEqual({ guilty: [1, 2, 1, 3], unassigned: [4] });
  expect(moveCharacter(order, -1, 'guilty')).toBe(order);
});

it('displays each character once, with untouched cards followed by drops in each pool', () => {
  const characters = Object.freeze([1, 2, 3, 4, 5, 6].map(id => ({ id, name: String(id) } as Character)));
  const order = { guilty: [3, 99, 1, 3], unassigned: [6, 2, 1, 99, 6] };
  const result = groupCharacters(characters, order);
  expect(result.guilty).toEqual([characters[2], characters[0]]);
  expect(result.unassigned).toEqual([characters[3], characters[4], characters[5], characters[1]]);
  expect(groupCharacters([], order)).toEqual({ guilty: [], unassigned: [] });
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
