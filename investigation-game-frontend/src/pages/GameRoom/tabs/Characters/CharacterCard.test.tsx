import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Character } from '@/types';
import CharacterCard, { CharacterCardOverlay } from './CharacterCard';

const drag = vi.hoisted(() => ({ pointerDown: vi.fn(), touchStart: vi.fn(), register: vi.fn() }));
vi.mock('@dnd-kit/core', () => ({
  useDraggable: (options: unknown) => {
    drag.register(options);
    return {
      attributes: { 'aria-roledescription': 'draggable' },
      listeners: { onPointerDown: drag.pointerDown, onTouchStart: drag.touchStart },
      setNodeRef: vi.fn(),
      isDragging: false,
    };
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const character = { id: 9, name: 'Avery', background: 'Filed witness statement.' } as Character;
const intel = (key: string) => `pages.gameRoom.suspects.card.${key}`;
const unread = 'pages.gameRoom.characterFolio.unreadIntel';

beforeEach(() => vi.clearAllMocks());

it('opens intel, clears unread through the parent and restores focus on Escape', () => {
  const onReadIntel = vi.fn();
  const view = render(<CharacterCard character={character} isUnread onReadIntel={onReadIntel} />);
  const toggle = screen.getByRole('button', { name: intel('viewIntel') });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveAccessibleDescription(unread);
  expect(view.container.querySelector('[data-unread]')).toBeInTheDocument();
  fireEvent.click(toggle);
  expect(onReadIntel).toHaveBeenCalledExactlyOnceWith(character.id);
  view.rerender(<CharacterCard character={character} isUnread={false} onReadIntel={onReadIntel} />);
  expect(toggle).not.toHaveAttribute('aria-describedby');
  expect(view.container.querySelector('[data-unread]')).not.toBeInTheDocument();
  expect(toggle).toHaveAccessibleName(intel('closeIntel'));
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const reader = screen.getByRole('region', { name: intel('backgroundIntel') });
  expect(reader).toHaveTextContent(character.background!);
  reader.focus();
  fireEvent.keyDown(reader, { key: 'Escape' });
  expect(reader).not.toBeVisible();
  expect(toggle).toHaveFocus();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

it('isolates the toggle and reader from pointer and touch drag activation', () => {
  render(<CharacterCard character={character} isUnread={false} onReadIntel={vi.fn()} />);
  const name = screen.getByRole('heading', { name: character.name });
  const toggle = screen.getByRole('button', { name: intel('viewIntel') });
  fireEvent.pointerDown(toggle);
  fireEvent.touchStart(toggle);
  expect(drag.pointerDown).not.toHaveBeenCalled();
  expect(drag.touchStart).not.toHaveBeenCalled();
  fireEvent.pointerDown(name);
  fireEvent.touchStart(name);
  expect(drag.pointerDown).toHaveBeenCalledOnce();
  expect(drag.touchStart).toHaveBeenCalledOnce();
  fireEvent.click(toggle);
  expect(drag.register).toHaveBeenLastCalledWith({
    id: 'character-9', disabled: true, data: { type: 'CHARACTER', characterId: 9 },
  });
  fireEvent.pointerDown(name);
  fireEvent.touchStart(screen.getByRole('region', { name: intel('backgroundIntel') }));
  expect(drag.pointerDown).toHaveBeenCalledOnce();
  expect(drag.touchStart).toHaveBeenCalledOnce();
  fireEvent.click(toggle);
  expect(drag.register).toHaveBeenLastCalledWith(expect.objectContaining({ disabled: false }));
});

it('keeps intel unread through hover, focus and drag initiation', () => {
  const onReadIntel = vi.fn();
  render(<CharacterCard character={{ ...character, background: ' ', current_status: 'deceased' }} isUnread onReadIntel={onReadIntel} />);
  expect(screen.getByText('pages.gameRoom.characters.deceased')).toBeVisible();
  const name = screen.getByRole('heading', { name: character.name });
  const toggle = screen.getByRole('button', { name: intel('viewIntel') });
  fireEvent.mouseEnter(name);
  fireEvent.pointerDown(name);
  toggle.focus();
  expect(onReadIntel).not.toHaveBeenCalled();
  expect(toggle).toHaveAccessibleDescription(unread);
  fireEvent.click(toggle);
  expect(onReadIntel).toHaveBeenCalledExactlyOnceWith(character.id);
  expect(screen.getByText(intel('noBackground'))).toBeVisible();
});

it('keeps the drag preview visual only', () => {
  render(<CharacterCardOverlay character={character} />);
  expect(screen.getByText(character.name)).toBeVisible();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { hidden: true })).not.toBeInTheDocument();
  expect(drag.register).not.toHaveBeenCalled();
});

it('falls back from a broken portrait and retries when the portrait URL changes', () => {
  const onReadIntel = vi.fn();
  const view = render(<CharacterCard character={{ ...character, img_url: '/missing.jpg' }} isUnread={false} onReadIntel={onReadIntel} />);
  const portrait = screen.getByAltText('');
  fireEvent.error(portrait);
  expect(portrait).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: character.name })).toBeVisible();
  view.rerender(<CharacterCard character={{ ...character, img_url: '/replacement.jpg' }} isUnread={false} onReadIntel={onReadIntel} />);
  expect(screen.getByAltText('')).toHaveAttribute('src', '/replacement.jpg');
});
