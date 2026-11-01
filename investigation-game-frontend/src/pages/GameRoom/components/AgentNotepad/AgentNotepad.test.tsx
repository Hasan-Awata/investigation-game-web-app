import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AgentNotepad from './AgentNotepad';

vi.mock('@/utils/userState', () => ({ getLocalUser: () => ({ id: 7 }) }));
afterEach(() => localStorage.clear());

it('flushes the latest notes on pagehide before the debounce completes', () => {
  render(<AgentNotepad roomId={1} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Latest clue' } });
  fireEvent(window, new PageTransitionEvent('pagehide'));
  expect(JSON.parse(localStorage.getItem('room_1_user_7_ledger')!)).toBe('Latest clue');
});

it('restores flushed notes on remount', () => {
  const view = render(<AgentNotepad roomId={1} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Remember this' } });
  fireEvent(window, new PageTransitionEvent('pagehide'));
  view.unmount();
  render(<AgentNotepad roomId={1} />);
  expect(screen.getByRole('textbox')).toHaveValue('Remember this');
});
