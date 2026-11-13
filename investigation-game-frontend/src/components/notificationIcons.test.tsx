import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { notificationIcons } from './notificationIcons';
import RoomToasts from '@/pages/GameRoom/components/RoomToasts/RoomToasts';
import AdminToasts from '@/pages/Admin/components/AdminToasts';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { dir: () => 'ltr' } }) }));
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
