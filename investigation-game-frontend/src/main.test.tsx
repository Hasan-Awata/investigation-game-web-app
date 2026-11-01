import { afterEach, expect, it, vi } from 'vitest';

const { echo } = vi.hoisted(() => ({ echo: vi.fn() }));
vi.mock('laravel-echo', () => ({ default: class { constructor(options: unknown) { echo(options); } } }));
vi.mock('react-dom/client', () => ({ default: { createRoot: () => ({ render: vi.fn() }) } }));
vi.mock('./App.tsx', () => ({ default: () => null }));
vi.mock('./i18n', () => ({}));

afterEach(() => { vi.resetModules(); echo.mockClear(); });

it.each(['http', 'https'])('uses the configured Reverb %s transport', async (scheme) => {
  vi.doMock('@/config/env', () => ({ ENV: { API_BASE_URL: 'https://api.example.test', PUSHER_APP_KEY: '', REVERB_APP_KEY: 'public-key', REVERB_HOST: 'socket.example.test', REVERB_PORT: 443, REVERB_SCHEME: scheme } }));
  await import('./main');
  expect(echo).toHaveBeenCalledWith(expect.objectContaining({ broadcaster: 'reverb', forceTLS: scheme === 'https' }));
});
