import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Character, GameRoom, Level } from '@/types';
import CharactersTab from './CharactersTab';

let room: GameRoom;
let characters: Character[] = [];
const submit = vi.fn();
const acknowledge = vi.fn();
vi.mock('@/context/RoomContext.shared', () => ({
  useRoomData: () => ({ room, accumulatedCharacters: characters }),
  useRoomUI: () => ({ viewedCharacters: new Set<number>(), markCharacterAsViewed: vi.fn() }),
}));
vi.mock('./CharacterCard', () => ({ default: ({ character }: { character: Character }) => <article>{character.name}</article> }));
vi.mock('../../components/RoomDialogs/RoomFeedbackDialog', () => ({ default: ({ message, onAcknowledge }: { message: string; onAcknowledge: () => void }) => <button onClick={onAcknowledge}>{message}</button> }));
vi.mock('@dnd-kit/core', () => ({ useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const key = (name: string) => `pages.gameRoom.characterFolio.${name}`;

beforeEach(() => {
  vi.clearAllMocks();
  characters = [];
  room = { game_case: { zones: [{ levels: [
    { id: 1, is_initial: true, presentation_type: 'location' },
    { id: 2, is_initial: true, presentation_type: 'interrogation' },
  ] as Level[] }] }, completed_levels: [] } as unknown as GameRoom;
});
function tab(guilty: number[] = [], isSubmitting = false, feedback: { type: 'error'; message: string } | null = null, unassigned: number[] = []) {
  return <CharactersTab characterOrder={{ guilty, unassigned }} isSubmitting={isSubmitting} feedback={feedback} submitVerdict={submit} clearFeedback={acknowledge} />;
}
it('keeps an unfinished initial interrogation required', () => {
  render(tab());
  expect(screen.getByRole('button', { name: key('submit') })).toBeDisabled();
});
it('allows the final verdict after the interview without demanding location completion records', () => {
  room.completed_levels = [{ id: 2 }] as Level[];
  render(tab());
  fireEvent.click(screen.getByRole('button', { name: key('submit') }));
  expect(submit).toHaveBeenCalledOnce();
});
it('allows a case with only locations to use the normal assessment rules', () => {
  room.game_case!.zones![0].levels = [{ id: 1, is_initial: true, presentation_type: 'location' }] as Level[];
  render(tab());
  expect(screen.getByRole('button', { name: key('submit') })).toBeEnabled();
});
it('renders both pools in drop order alongside the shared filing action', () => {
  characters = [1, 2, 3, 4].map(id => ({ id, name: String(id) } as Character));
  render(tab([2, 1], false, null, [4, 3]));
  const suspects = screen.getByRole('region', { name: key('guilty') });
  const innocent = screen.getByRole('region', { name: key('unassigned') });
  expect(within(suspects).getAllByRole('article').map(node => node.textContent)).toEqual(['2', '1']);
  expect(within(innocent).getAllByRole('article').map(node => node.textContent)).toEqual(['4', '3']);
  expect(screen.getByRole('button', { name: key('submit') })).toBeInTheDocument();
});
it('shows busy feedback and blocks duplicate submission', () => {
  room.completed_levels = [{ id: 2 }] as Level[];
  render(tab([], true));
  const button = screen.getByRole('button', { name: key('filingPending') });
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button.textContent).toBe('');
  fireEvent.click(button);
  expect(submit).not.toHaveBeenCalled();
});
it('preserves acknowledgment of rejected verdicts', () => {
  render(tab([], false, { type: 'error', message: 'Rejected' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rejected' }));
  expect(acknowledge).toHaveBeenCalledOnce();
});

it('removes the locked notice and its button description when interrogations finish', () => {
  const view = render(tab());
  const button = screen.getByRole('button', { name: key('submit') });
  expect(screen.getByText(key('locked'))).toBeInTheDocument();
  expect(button).toHaveAccessibleDescription(key('locked'));
  room.completed_levels = [{ id: 2 }] as Level[];
  view.rerender(tab());
  expect(button).toBeEnabled();
  expect(screen.queryByText(key('locked'))).not.toBeInTheDocument();
  expect(button).not.toHaveAttribute('aria-describedby');
});
