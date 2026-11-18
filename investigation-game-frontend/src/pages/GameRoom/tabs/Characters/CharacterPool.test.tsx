import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Character } from '@/types';
import CharacterPool from './CharacterPool';
import styles from './CharactersTab.module.css';

const drag = vi.hoisted(() => ({ isOver: false, setNodeRef: vi.fn(), cardRender: vi.fn() }));
vi.mock('@dnd-kit/core', () => ({ useDroppable: () => drag }));
vi.mock('./CharacterCard', () => ({ default: ({ character }: { character: Character }) => {
  drag.cardRender();
  return <article>{character.name}</article>;
} }));

beforeEach(() => { drag.isOver = false; vi.clearAllMocks(); });

it('updates drag highlighting without rebuilding an unchanged card list', () => {
  const props = {
    pool: 'guilty' as const, title: 'Guilty', emptyMessage: 'Drop here',
    characters: [{ id: 1, name: 'Avery' }] as Character[],
    viewedCharacters: new Set<number>(), onReadIntel: vi.fn(),
  };
  const view = render(<CharacterPool {...props} />);
  expect(drag.cardRender).toHaveBeenCalledOnce();
  drag.isOver = true;
  view.rerender(<CharacterPool {...props} />);
  expect(screen.getByRole('region', { name: 'Guilty' })).toHaveClass(styles.isDragOver, styles.suspects);
  expect(drag.cardRender).toHaveBeenCalledOnce();
});

it('keeps a labeled empty drop target with the existing placeholder', () => {
  render(<CharacterPool pool="unassigned" title="بريء" emptyMessage="Empty"
    characters={[]} viewedCharacters={new Set()} onReadIntel={vi.fn()} />);
  expect(screen.getByRole('region', { name: 'بريء' })).not.toHaveClass(styles.suspects);
  expect(screen.getByText('Empty')).toBeVisible();
});
