import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useGameRoom } from './useGameRoom';
import { fetchRoomState, joinRoom } from '@/services/api';
import { success, failure } from '@/utils/Result';
import type { GameRoom } from '@/types';

vi.mock('@/services/api', () => ({ fetchRoomState: vi.fn(), joinRoom: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const room: GameRoom = { id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };
beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(joinRoom).mockResolvedValue(success(room));
  vi.mocked(fetchRoomState).mockResolvedValue(success(room));
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useGameRoom('ABC123'), { wrapper });
}
it('hides cached room data and stops recovery after authoritative denial', async () => {
  const hook = setup();
  await waitFor(() => expect(hook.result.current.room?.id).toBe(1));
  act(() => window.dispatchEvent(new CustomEvent('api:forbidden', { detail: { endpoint: '/rooms/1', method: 'GET', message: 'Not a participant.' } })));
  await waitFor(() => expect(hook.result.current.room).toBeUndefined());
  expect(hook.result.current.accessDenied).toBe('Not a participant.');
  const before = vi.mocked(fetchRoomState).mock.calls.length;
  act(() => window.dispatchEvent(new Event('online')));
  await act(async () => { await hook.result.current.refreshRoomData(); });
  expect(fetchRoomState).toHaveBeenCalledTimes(before);
  hook.unmount();
});
it('joins and restores authoritative progress without session storage or Echo', async () => {
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...room, strikes: 2 }));
  const hook = setup();
  await waitFor(() => expect(hook.result.current.room?.strikes).toBe(2));
  expect(joinRoom).toHaveBeenCalledWith('ABC123');
});
it('retains cached progress after failure and resynchronizes on visible-tab reconnection', async () => {
  const hook = setup();
  await waitFor(() => expect(hook.result.current.room?.id).toBe(1));
  vi.mocked(fetchRoomState).mockResolvedValueOnce(failure('offline'));
  await act(async () => { await hook.result.current.refreshRoomData(); });
  expect(hook.result.current.error).toBeNull();
  await waitFor(() => expect(hook.result.current.syncError).toBe('offline'));
  expect(hook.result.current.room?.id).toBe(1);
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...room, strikes: 1 }));
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(hook.result.current.room?.strikes).toBe(1));
  expect(hook.result.current.syncError).toBeNull();
});
it('retries an initial join failure when connectivity returns', async () => {
  vi.mocked(joinRoom).mockResolvedValueOnce(failure('offline'));
  const hook = setup();
  await waitFor(() => expect(hook.result.current.error).toBe('offline'));
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(hook.result.current.room?.id).toBe(1));
});
it('converges after a missed completion event without a socket or browser event', async () => {
  const hook = setup();
  await waitFor(() => expect(hook.result.current.room?.id).toBe(1));
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...room, status: 'solved', strikes: 1 }));
  await waitFor(() => expect(hook.result.current.room?.status).toBe('solved'), { timeout: 6500 });
}, 10000);

it('shares overlapping refreshes and aborts the request when leaving', async () => {
  const hook = setup();
  await waitFor(() => expect(hook.result.current.room?.id).toBe(1));
  let requestSignal: AbortSignal | undefined;
  vi.mocked(fetchRoomState).mockImplementation((_id, signal) => {
    requestSignal = signal;
    return new Promise(() => undefined);
  });
  const before = vi.mocked(fetchRoomState).mock.calls.length;
  act(() => {
    void hook.result.current.refreshRoomData();
    void hook.result.current.refreshRoomData();
    window.dispatchEvent(new Event('online'));
  });
  expect(fetchRoomState).toHaveBeenCalledTimes(before + 1);
  expect(requestSignal?.aborted).toBe(false);
  hook.unmount();
  expect(requestSignal?.aborted).toBe(true);
});

it('times out a hung refresh and remains recoverable without losing cached progress', async () => {
  const hook = setup();
  await waitFor(() => expect(hook.result.current.room?.id).toBe(1));
  vi.useFakeTimers();
  try {
    vi.mocked(fetchRoomState).mockImplementationOnce((_id, signal) => new Promise(resolve => {
      signal?.addEventListener('abort', () => resolve(failure('Timed out')), { once: true });
    }));
    act(() => { void hook.result.current.refreshRoomData(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(hook.result.current.room?.id).toBe(1);
    vi.mocked(fetchRoomState).mockResolvedValue(success({ ...room, strikes: 2 }));
    await act(async () => { await hook.result.current.refreshRoomData(); await vi.advanceTimersByTimeAsync(1); });
    expect(hook.result.current.room?.strikes).toBe(2);
    expect(hook.result.current.syncError).toBeNull();
  } finally {
    hook.unmount();
    vi.useRealTimers();
  }
});
