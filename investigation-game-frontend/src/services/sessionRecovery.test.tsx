import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { login } from './auth';
import { request, requestBlob } from './request';
import App from '@/App';

vi.mock('@/pages/MainMenu/MainMenu', () => ({ default: () => <div>Investigation menu</div> }));
vi.mock('@/pages/Auth/Auth', () => ({ default: ({ onSuccess }: { onSuccess: (user: object) => void }) => <button onClick={async () => { const result = await login('player@example.test', 'correct'); if (result.isSuccess) onSuccess(result.value.user); }}>Sign in</button> }));
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it('retains authenticated UI on forbidden actions and recovers after concurrent expiry', async () => {
  localStorage.setItem('auth_token', 'valid');
  const user = { id: 1, name: 'Player', username: 'player' };
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json(user)));
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  await screen.findByText('Investigation menu');
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ message: 'Missing prerequisite.' }, { status: 403 })));
  await act(async () => { expect(await request('/rooms/1/inspect', { method: 'POST' })).toMatchObject({ isSuccess: false, status: 403 }); });
  expect(screen.getByText('Investigation menu')).toBeInTheDocument();
  expect(localStorage.getItem('auth_token')).toBe('valid');
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ accepted: true })));
  expect(await request('/rooms/1/inspect', { method: 'POST' })).toMatchObject({ isSuccess: true });
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({}, { status: 401 })));
  await act(async () => { await Promise.all([request('/rooms/1'), requestBlob('/download')]); });
  await screen.findByText('Sign in');
  expect(localStorage.getItem('auth_token')).toBeNull();
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ user, token: 'replacement' })));
  fireEvent.click(screen.getByText('Sign in'));
  await waitFor(() => expect(screen.getByText('Investigation menu')).toBeInTheDocument());
  expect(localStorage.getItem('auth_token')).toBe('replacement');
});

it('does not revoke a replacement token on a late old-session failure or bad login', async () => {
  localStorage.setItem('auth_token', 'old');
  let finish!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; })));
  const pending = request('/rooms/1');
  localStorage.setItem('auth_token', 'new');
  finish(Response.json({}, { status: 401 }));
  await pending;
  expect(localStorage.getItem('auth_token')).toBe('new');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Invalid credentials provided.' }, { status: 401 })));
  expect(await login('player@example.test', 'wrong')).toMatchObject({ isSuccess: false, errorMessage: 'Invalid credentials provided.' });
  expect(localStorage.getItem('auth_token')).toBe('new');
});
