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
  expect(hook.result.current.room?.id).toBe(1);
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...room, strikes: 1 }));
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => expect(hook.result.current.room?.strikes).toBe(1));
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
