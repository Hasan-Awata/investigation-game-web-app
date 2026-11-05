import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Zone } from '@/types';
import ZoneCard from './ZoneCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

beforeEach(() => {
  // jsdom has a dialog element but does not implement its modal lifecycle.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); } },
  });
});

const zone: Zone = {
  id: 42,
  case_id: 1,
  order_index: 1,
  title: 'Warehouse district',
  levels: [
    { id: 3, zone_id: 42, title: 'Hidden office', order_index: 3, presentation_type: 'location', is_initial: false, details: '' },
    { id: 2, zone_id: 42, title: 'Sealed records', order_index: 2, presentation_type: 'location', is_initial: false, required_request_id: 7, details: '' },
    { id: 1, zone_id: 42, title: 'Night guard', order_index: 1, presentation_type: 'interrogation', is_initial: true, details: '' },
  ],
};

function openZone(currentZone = zone) {
  const onClose = vi.fn();
  const onEnter = vi.fn();
  render(<ZoneCard zone={currentZone} unlockedLevelIds={new Set([2])} onClose={onClose} onEnter={onEnter} />);
  const dialog = screen.getByRole('dialog', { name: zone.title });
  return { dialog, onClose, onEnter };
}

it('sorts lead previews and hides undiscovered titles', () => {
  const { dialog } = openZone();
  const rows = within(dialog).getAllByRole('listitem');

  expect(rows[0]).toHaveTextContent(/^Night guard$/);
  expect(within(rows[1]).getByText('Sealed records')).toBeInTheDocument();
  expect(within(rows[1]).getByRole('img', { name: 'Warrant required' })).toBeInTheDocument();
  expect(rows[2]).toHaveTextContent(/^Unknown lead$/);
  expect(within(dialog).queryByText('Hidden office')).not.toBeInTheDocument();
});

it('shows readable fallbacks for a zone with no description or leads', () => {
  openZone({ ...zone, levels: undefined });
  expect(screen.getByText('No leads are currently available in this zone.')).toBeInTheDocument();
  expect(screen.getByText('No description is available for this zone.')).toBeInTheDocument();
});

it('dismisses through the close button, Escape event, and backdrop', () => {
  const { dialog, onClose } = openZone();
  const title = within(dialog).getByRole('heading', { name: zone.title });

  fireEvent.pointerDown(title);
  fireEvent.click(dialog);
  fireEvent.click(title);
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Close (Esc)' }));
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  fireEvent.pointerDown(dialog);
  fireEvent.click(dialog);
  expect(onClose).toHaveBeenCalledTimes(3);
});

it('passes the selected zone ID to Travel', () => {
  const { onEnter, onClose } = openZone();
  fireEvent.click(screen.getByRole('button', { name: 'Travel to Zone' }));
  expect(onEnter).toHaveBeenCalledExactlyOnceWith(42);
  expect(onClose).not.toHaveBeenCalled();
});
