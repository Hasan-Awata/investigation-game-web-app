import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });

it('preserves tokens, prevents retries and duplicate submissions, and recovers each mode independently', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ message: 'Wait', retry_after: 2 }, { status: 429 }));
  vi.stubGlobal('fetch', fetch);
  localStorage.setItem('auth_token', 'valid');
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => useAuth(vi.fn()), { wrapper });
  const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
  act(() => { result.current.setEmail('player@example.test'); result.current.setPassword('secret'); });
  act(() => { result.current.handleSubmit(event); result.current.handleSubmit(event); });
  await waitFor(() => expect(result.current.retryAfterSeconds).toBe(2));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('auth_token')).toBe('valid');
  act(() => result.current.handleSubmit(event));
  expect(fetch).toHaveBeenCalledTimes(1);
  act(() => result.current.toggleAuthMode());
  expect(result.current.retryAfterSeconds).toBe(0);
  act(() => result.current.toggleAuthMode());
  expect(result.current.retryAfterSeconds).toBe(2);
  expect(result.current.email).toBe('player@example.test');
  await waitFor(() => expect(result.current.retryAfterSeconds).toBe(0), { timeout: 3500 });
  expect(fetch).toHaveBeenCalledTimes(1);
  act(() => result.current.handleSubmit(event));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  unmount();
  client.clear();
});
