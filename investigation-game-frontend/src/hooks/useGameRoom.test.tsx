import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGameRoom } from './useGameRoom';
import { fetchRoomState, joinRoom } from '@/services/api';
import { success, failure } from '@/utils/Result';
import type { GameRoom } from '@/types';

vi.mock('@/services/api', () => ({ fetchRoomState: vi.fn(), joinRoom: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const room: GameRoom = { id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };
beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(joinRoom).mockReset();
  vi.mocked(fetchRoomState).mockReset();
  vi.mocked(joinRoom).mockResolvedValue(success(room));
  vi.mocked(fetchRoomState).mockResolvedValue(success(room));
});
afterEach(() => vi.useRealTimers());
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(({ code }) => useGameRoom(code), { wrapper, initialProps: { code: 'ABC123' } });
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
  expect(joinRoom).toHaveBeenCalledWith('ABC123', expect.any(AbortSignal));
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
it('waits for an explicit retry after an initial join failure', async () => {
  vi.mocked(joinRoom).mockResolvedValueOnce(failure('offline'));
  const hook = setup();
  await waitFor(() => expect(hook.result.current.error).toBe('offline'));
  act(() => window.dispatchEvent(new Event('online')));
  expect(joinRoom).toHaveBeenCalledTimes(1);
  act(() => { hook.result.current.retryRoom(); hook.result.current.retryRoom(); });
  await waitFor(() => expect(hook.result.current.room?.id).toBe(1));
  expect(joinRoom).toHaveBeenCalledTimes(2);
});

it.each([false, true])('offers an explicit retry after the first read fails (stored ID: %s)', async stored => {
  if (stored) sessionStorage.setItem('active_room_id_for_ABC123', '1');
  vi.mocked(fetchRoomState).mockResolvedValueOnce(failure('Service unavailable', undefined, { status: 503 }));
  const hook = setup();
  await waitFor(() => expect(hook.result.current.error).toBe('Service unavailable'));
  expect(hook.result.current.canRetry).toBe(true);
  vi.useFakeTimers();
  await act(async () => {
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('pageshow'));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(10000);
  });
  expect(fetchRoomState).toHaveBeenCalledTimes(1);
  await act(async () => {
    hook.result.current.retryRoom();
    hook.result.current.retryRoom();
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(hook.result.current.room?.id).toBe(1);
  expect(hook.result.current.error).toBeNull();
  expect(fetchRoomState).toHaveBeenCalledTimes(2);
  expect(joinRoom).toHaveBeenCalledTimes(stored ? 0 : 1);
  hook.unmount();
});

it.each([401, 403, 404, 410, 422])('does not offer retries for permanent first-read status %s', async status => {
  vi.mocked(fetchRoomState).mockResolvedValue(failure('Cannot read room', undefined, { status }));
  const hook = setup();
  await waitFor(() => expect(hook.result.current.error).toBe('Cannot read room'));
  expect(hook.result.current.canRetry).toBe(false);
  await act(async () => {
    hook.result.current.retryRoom();
    await hook.result.current.refreshRoomData();
    window.dispatchEvent(new Event('online'));
  });
  expect(fetchRoomState).toHaveBeenCalledTimes(1);
});

it('does not rejoin a permanently denied room on retry or connectivity events', async () => {
  vi.mocked(joinRoom).mockResolvedValue(failure('Not allowed', undefined, { status: 403 }));
  const hook = setup();
  await waitFor(() => expect(hook.result.current.error).toBe('Not allowed'));
  expect(hook.result.current.canRetry).toBe(false);
  act(() => { hook.result.current.retryRoom(); window.dispatchEvent(new Event('online')); });
  expect(joinRoom).toHaveBeenCalledTimes(1);
  expect(fetchRoomState).not.toHaveBeenCalled();
});

it('aborts the old initial snapshot on room change and never displays its late response', async () => {
  sessionStorage.setItem('active_room_id_for_ABC123', '1');
  sessionStorage.setItem('active_room_id_for_SECOND', '2');
  let oldSignal: AbortSignal | undefined;
  let finishOld!: (value: ReturnType<typeof success<GameRoom>>) => void;
  vi.mocked(fetchRoomState).mockImplementationOnce((_id, signal) => {
    oldSignal = signal;
    return new Promise(resolve => { finishOld = resolve; });
  }).mockResolvedValue(success({ ...room, id: 2, invite_code: 'SECOND' }));
  const hook = setup();
  await waitFor(() => expect(fetchRoomState).toHaveBeenCalledTimes(1));
  hook.rerender({ code: 'SECOND' });
  await waitFor(() => expect(hook.result.current.room?.id).toBe(2));
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => { finishOld(success(room)); });
  expect(hook.result.current.room?.id).toBe(2);
});

it('aborts an in-flight join on departure and ignores its late response', async () => {
  let signal: AbortSignal | undefined;
  let finish!: (value: ReturnType<typeof success<GameRoom>>) => void;
  vi.mocked(joinRoom).mockImplementationOnce((_code, requestSignal) => {
    signal = requestSignal;
    return new Promise(resolve => { finish = resolve; });
  });
  const hook = setup();
  await waitFor(() => expect(joinRoom).toHaveBeenCalledTimes(1));
  hook.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => { finish(success(room)); });
  expect(fetchRoomState).not.toHaveBeenCalled();
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
