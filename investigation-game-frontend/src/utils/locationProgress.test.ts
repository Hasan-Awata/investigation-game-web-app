import { describe, expect, it } from 'vitest';
import type { Level, Question, RoomInspection } from '@/types';
import { getOpenLocationQuestions, isLocationLevelInspected } from './locationProgress';

const scene = (id: number, nextId?: number): Question => ({
  id, level_id: 1, text: `Scene ${id}`,
  choices: [{ id: id * 10, question_id: id, text: '10,20 | Point', next_question_id: nextId }],
});
const level = (questions: Question[]): Level => ({
  id: 1, zone_id: 1, title: 'Location', details: '', order_index: 1, is_initial: true,
  presentation_type: 'location', questions,
});
const inspection = (choiceId: number, deadEnd = false): RoomInspection => ({ room_id: 1, choice_id: choiceId, is_dead_end: deadEnd });

describe('location progress', () => {
  it('requires an inspection in every open scene', () => {
    const location = level([scene(1), scene(2)]);
    expect(isLocationLevelInspected(location, [])).toBe(false);
    expect(isLocationLevelInspected(location, [inspection(10)])).toBe(false);
    expect(isLocationLevelInspected(location, [inspection(10), inspection(20)])).toBe(true);
  });
  it('counts dead ends as inspected scenes', () => {
    expect(isLocationLevelInspected(level([scene(1), scene(2)]), [inspection(10, true)])).toBe(false);
    expect(isLocationLevelInspected(level([scene(1), scene(2)]), [inspection(10, true), inspection(20, true)])).toBe(true);
  });
  it('does not count inspections in other levels', () => {
    expect(isLocationLevelInspected(level([scene(1)]), [inspection(999)])).toBe(false);
  });
  it('requires only one inspected point in each scene', () => {
    const question = scene(1);
    question.choices!.push({ id: 11, question_id: 1, text: '20,30 | Another point' });
    expect(isLocationLevelInspected(level([question]), [inspection(10)])).toBe(true);
  });
  it('ignores closed scenes and becomes incomplete when a new scene opens', () => {
    const location = level([scene(1), scene(2, 3), scene(3)]);
    expect(getOpenLocationQuestions(location.questions!, []).map(question => question.id)).toEqual([1, 2]);
    expect(isLocationLevelInspected(location, [inspection(10)])).toBe(false);
    const opened = [inspection(10), inspection(20)];
    expect(getOpenLocationQuestions(location.questions!, opened).map(question => question.id)).toEqual([1, 2, 3]);
    expect(isLocationLevelInspected(location, opened)).toBe(false);
    expect(isLocationLevelInspected(location, [...opened, inspection(30)])).toBe(true);
  });
  it('does not require unopened linked scenes', () => {
    const root = scene(1);
    root.choices!.push({ id: 11, question_id: 1, text: '20,30 | Door', next_question_id: 2 });
    expect(isLocationLevelInspected(level([root, scene(2)]), [inspection(10)])).toBe(true);
  });
  it('does not open a scene from a dead end', () => {
    expect(getOpenLocationQuestions([scene(1, 2), scene(2)], [inspection(10, true)]).map(question => question.id)).toEqual([1]);
  });
  it('does not mark empty or missing scene data complete', () => {
    expect(isLocationLevelInspected(level([]), [])).toBe(false);
    expect(isLocationLevelInspected({ ...level([]), questions: undefined }, [])).toBe(false);
    expect(isLocationLevelInspected(level([{ id: 1, level_id: 1, text: '' }]), [])).toBe(false);
  });
});
