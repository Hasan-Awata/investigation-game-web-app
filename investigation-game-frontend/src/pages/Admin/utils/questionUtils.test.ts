import { expect, it } from 'vitest';
import { buildNodeFormData } from './questionUtils';

it('preserves every supported outcome when an existing choice is saved', () => {
  const form = buildNodeFormData({
    level_id: '8', text: 'Edited question', store_locally: true,
    choices: [{
      id: 7, text: 'Answer',
      outcomes: {
        feedback: ' Follow this lead ', next_question_id: 9, gives_strike: true,
        unlock_evidence: [11], unlock_levels: [12], unlock_location_points: [42],
        character_updates: [{ id: 13, is_unlocked: true, status: 'deceased' }],
      },
      requirements: { required_evidence: [14], required_choices: [15] },
    }],
  });

  expect(Object.fromEntries(form.entries())).toEqual({
    level_id: '8', text: 'Edited question', store_locally: '1',
    'choices[0][id]': '7', 'choices[0][text]': 'Answer',
    'choices[0][outcomes][feedback]': 'Follow this lead',
    'choices[0][outcomes][next_question_id]': '9',
    'choices[0][outcomes][gives_strike]': '1',
    'choices[0][outcomes][unlock_evidence][0]': '11',
    'choices[0][outcomes][unlock_levels][0]': '12',
    'choices[0][outcomes][unlock_location_points][0]': '42',
    'choices[0][outcomes][character_updates][0][id]': '13',
    'choices[0][outcomes][character_updates][0][is_unlocked]': '1',
    'choices[0][outcomes][character_updates][0][status]': 'deceased',
    'choices[0][requirements][required_evidence][0]': '14',
    'choices[0][requirements][required_choices][0]': '15',
  });
});

it('omits draft identities and empty outcomes while encoding a coordinate choice', () => {
  const form = buildNodeFormData({
    level_id: '8', text: 'Location', store_locally: false,
    choices: [{
      id: 'unsaved-choice', text: 'Old label',
      coordinate: { x: '10', y: '20', label: 'Desk' },
      outcomes: { unlock_location_points: [], gives_strike: false, feedback: ' ' },
      requirements: { required_evidence: [], required_choices: [] },
    }],
  });

  expect(Object.fromEntries(form.entries())).toEqual({
    level_id: '8', text: 'Location', store_locally: '0', 'choices[0][text]': '10,20 | Desk',
  });
});
