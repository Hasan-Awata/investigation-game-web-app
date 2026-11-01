import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { GameRoom, Level } from '@/types';
import CharactersTab from './CharactersTab';

let room: GameRoom;
vi.mock('@/context/RoomContext.shared', () => ({
  useRoomData: () => ({ room, accumulatedCharacters: [] }),
  useRoomUI: () => ({ viewedCharacters: new Set<number>(), markCharacterAsViewed: vi.fn() }),
}));
vi.mock('@dnd-kit/core', () => ({ useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function renderVerdict(completed: number[], withInterview = true) {
  const levels = [
    { id: 1, is_initial: true, presentation_type: 'location' },
    ...(withInterview ? [{ id: 2, is_initial: true, presentation_type: 'interrogation' }] : []),
  ] as Level[];
  room = { game_case: { zones: [{ levels }] }, completed_levels: completed.map(id => ({ id })) } as GameRoom;
  const submitVerdict = vi.fn();
  render(<CharactersTab guiltyIds={[]} isSubmitting={false} feedback={null} submitVerdict={submitVerdict} clearFeedback={vi.fn()} />);
  return submitVerdict;
}

it('keeps an unfinished initial interrogation required', () => {
  renderVerdict([]);
  expect(screen.getByRole('button')).toBeDisabled();
});

it('allows the final verdict after the interview without demanding location completion records', () => {
  const submit = renderVerdict([2]);
  fireEvent.click(screen.getByRole('button'));
  expect(submit).toHaveBeenCalledOnce();
});

it('allows a case with only locations to use the normal assessment rules', () => {
  renderVerdict([], false);
  expect(screen.getByRole('button')).toBeEnabled();
});
