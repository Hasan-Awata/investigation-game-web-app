import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { getGameplayIconTone, notificationIcons } from './notificationIcons';
import RoomToasts from '@/pages/GameRoom/components/RoomToasts/RoomToasts';
import AdminToasts from '@/pages/Admin/components/AdminToasts';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { dir: () => 'ltr' } }) }));
beforeEach(() => { vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false }))); });
afterEach(() => { act(() => toast.remove()); vi.unstubAllGlobals(); });

it('renders every registry icon as an accessible decorative local SVG', () => {
  const { container } = render(<>{Object.values(notificationIcons)}</>);
  expect(container.querySelectorAll('svg')).toHaveLength(Object.keys(notificationIcons).length);
  for (const icon of container.querySelectorAll('svg')) {
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    expect(icon).toHaveAttribute('stroke', 'currentColor');
  }
  expect(container.querySelector('img')).toBeNull();
});

it('preserves gameplay ordering and content with distinct event icons', () => {
  render(<RoomToasts toasts={[
    { id: '1', type: 'evidence', title: 'Approved', message: 'Request approved', icon: 'proceduralApproved' },
    { id: '2', type: 'level', title: 'Warrant', message: 'Warrant executed', icon: 'warrantExecuted' },
    { id: '3', type: 'system', title: 'Casualty', message: 'Person deceased', icon: 'casualtyIdentified' },
  ]} />);
  expect(screen.getByText('Request approved')).toBeInTheDocument();
  expect([...document.querySelectorAll('[data-notification-icon]')].map(el => el.getAttribute('data-notification-icon')))
    .toEqual(['proceduralApproved', 'warrantExecuted', 'casualtyIdentified']);
});

it('keeps admin rich messages and loading updates while replacing default icons', () => {
  render(<AdminToasts />);
  let id = '';
  act(() => { id = toast.loading('Working'); });
  expect(document.querySelector('[data-notification-icon="loading"]')).toBeInTheDocument();
  act(() => { toast.success(<strong>Uploaded</strong>, { id, icon: notificationIcons.uploaded }); });
  expect(screen.getByText('Uploaded')).toBeInTheDocument();
  expect(document.querySelector('[data-notification-icon="uploaded"]')).toBeInTheDocument();
  expect(document.querySelector('[data-notification-icon="loading"]')).toBeNull();
  act(() => { toast.error('Failed'); });
  expect(document.querySelector('[data-notification-icon="error"]')).toBeInTheDocument();
});

it('retains loading notices and fades manually dismissed admin notices before removal', () => {
  vi.useFakeTimers();
  const { unmount } = render(<AdminToasts />);
  act(() => { toast.loading('Pending'); toast.success('Complete'); });
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.getByText('Pending')).toBeInTheDocument();
  expect(screen.getByText('Complete').closest('[data-visible]')).toHaveAttribute('data-visible', 'false');
  act(() => vi.advanceTimersByTime(160));
  expect(screen.queryByText('Complete')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.getByText('Pending').closest('[data-visible]')).toHaveAttribute('data-visible', 'false');
  act(() => vi.advanceTimersByTime(160));
  expect(screen.queryByText('Pending')).toBeNull();
  unmount();
  vi.useRealTimers();
});

it('assigns gameplay colors by event while keeping admin icons gold', () => {
  for (const icon of ['evidenceRecovered', 'personOfInterest', 'phaseUnlocked', 'information', 'loading'] as const) {
    expect(getGameplayIconTone(icon)).toBe('intel');
  }
  for (const icon of ['proceduralApproved', 'warrantExecuted', 'success'] as const) {
    expect(getGameplayIconTone(icon)).toBe('success');
  }
  for (const icon of ['casualtyIdentified', 'validationError', 'error'] as const) {
    expect(getGameplayIconTone(icon)).toBe('failure');
  }
  const onDismiss = vi.fn();
  render(<><RoomToasts onDismiss={onDismiss} toasts={[
    { id: 'intel', type: 'evidence', title: 'Intel', message: 'Found', icon: 'evidenceRecovered' },
    { id: 'approved', type: 'evidence', title: 'Approved', message: 'Accepted', icon: 'proceduralApproved' },
    { id: 'casualty', type: 'system', title: 'Casualty', message: 'Deceased', icon: 'casualtyIdentified' },
  ]} /><AdminToasts /></>);
  expect(document.querySelector('[data-notification-icon="evidenceRecovered"]')?.parentElement).toHaveAttribute('data-icon-tone', 'intel');
  expect(document.querySelector('[data-notification-icon="proceduralApproved"]')?.parentElement).toHaveAttribute('data-icon-tone', 'success');
  expect(document.querySelector('[data-notification-icon="casualtyIdentified"]')?.parentElement).toHaveAttribute('data-icon-tone', 'failure');
  act(() => { toast.success('Admin saved'); toast.error('Admin failed'); });
  for (const icon of ['success', 'error']) {
    expect(document.querySelector(`[data-notification-icon="${icon}"]`)?.parentElement).toHaveAttribute('data-icon-tone', 'intel');
  }
  fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]);
  expect(onDismiss).toHaveBeenCalledWith('intel');
});
