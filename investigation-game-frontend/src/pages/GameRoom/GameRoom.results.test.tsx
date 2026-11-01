import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GameRoom from './GameRoom';
import { fetchRoomState, joinRoom } from '@/services/api';
import { success, failure } from '@/utils/Result';
import type { FinalStats, GameRoom as Room } from '@/types';

const route = vi.hoisted(() => ({ inviteCode: 'ABC123' }));
vi.mock('react-router-dom', () => ({ useParams: () => route, useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/services/api', () => ({ fetchRoomState: vi.fn(), joinRoom: vi.fn() }));
vi.mock('@/utils/userState', () => ({ getLocalUser: () => ({ id: 2 }) }));
vi.mock('./GameRoomLayout', async () => {
  const { useRoomData, useRoomUI } = await import('@/context/RoomContext.shared');
  const { default: GameEndOverlay } = await import('./components/GameEffects/GameEndOverlay');
  return { default: function ResultLayout(props: { resolutionMessage: string | null; finalStats: FinalStats | null }) {
    const { room } = useRoomData();
    const { setGameOverData } = useRoomUI();
    return <>
      <p>Room {room.id}: {room.status}</p>
      <button onClick={() => setGameOverData('First room result', room.final_stats)}>Result callback</button>
      <GameEndOverlay status={room.status} {...props} />
    </>;
  } };
});

const active: Room = { id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };
const stats: FinalStats = {
  time_taken: '12 minutes', xp_gained: 900, max_xp: 900,
  suspects_caught: 6, total_guilty: 6, innocents_accused: 0, xp_awards: { 1: 900, 2: 0 },
};
beforeEach(() => {
  route.inviteCode = 'ABC123';
  sessionStorage.clear();
  vi.mocked(joinRoom).mockReset().mockResolvedValue(success(active));
  vi.mocked(fetchRoomState).mockReset().mockResolvedValue(success(active));
  vi.stubGlobal('Echo', undefined);
});
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><GameRoom /></QueryClientProvider>);
  return { ...view, client, rerenderRoom: () => view.rerender(<QueryClientProvider client={client}><GameRoom /></QueryClientProvider>) };
}

it('renders a usable first-load Retry control and recovers without rejoining', async () => {
  vi.mocked(fetchRoomState).mockResolvedValueOnce(failure('HTTP unavailable', undefined, { status: 503 }));
  const view = setup();
  await screen.findByText('HTTP unavailable');
  expect(screen.getByRole('alert')).toHaveTextContent('HTTP unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'pages.gameRoom.retry' }));
  await screen.findByText('Room 1: active');
  expect(joinRoom).toHaveBeenCalledTimes(1);
  view.unmount();
});

it.each(['solved', 'failed'])('renders persisted %s statistics after HTTP-only recovery and reload', async status => {
  const view = setup();
  await screen.findByText('Room 1: active');
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...active, status, final_stats: stats }));
  await act(async () => { await view.client.refetchQueries({ queryKey: ['gameRoom', 'ABC123'] }); });
  expect(await screen.findByText('12 minutes')).toBeInTheDocument();
  expect(screen.getByText('pages.gameRoom.gameEndOverlay.xpGranted').parentElement).toHaveTextContent('0 / 900');
  const title = status === 'solved' ? 'caseClosed' : 'mandateRevoked';
  expect(screen.getByRole('heading', { name: `pages.gameRoom.gameEndOverlay.${title}` })).toBeInTheDocument();
  view.unmount();
  const revisited = setup();
  expect(await screen.findByText('12 minutes')).toBeInTheDocument();
  expect(screen.getByText('pages.gameRoom.gameEndOverlay.xpGranted').parentElement).toHaveTextContent('0 / 900');
  // The saved ID resumes with a read; it never repeats the membership mutation.
  expect(joinRoom).toHaveBeenCalledTimes(1);
  revisited.unmount();
  sessionStorage.clear();
  const reopened = setup();
  expect(await screen.findByText('12 minutes')).toBeInTheDocument();
  expect(screen.getByText('pages.gameRoom.gameEndOverlay.xpGranted').parentElement).toHaveTextContent('0 / 900');
  expect(joinRoom).toHaveBeenCalledTimes(2);
  reopened.unmount();
});

it('does not carry callback messages or statistics into another room', async () => {
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...active, status: 'solved', final_stats: stats }));
  const view = setup();
  await screen.findByText('12 minutes');
  fireEvent.click(screen.getByRole('button', { name: 'Result callback' }));
  expect(screen.getByText('First room result')).toBeInTheDocument();
  route.inviteCode = 'SECOND';
  sessionStorage.setItem('active_room_id_for_SECOND', '2');
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...active, id: 2, invite_code: 'SECOND', status: 'failed', final_stats: null }));
  view.rerenderRoom();
  await screen.findByText('Room 2: failed');
  expect(screen.queryByText('12 minutes')).not.toBeInTheDocument();
  expect(screen.queryByText('First room result')).not.toBeInTheDocument();
  expect(screen.getByText('pages.gameRoom.gameEndOverlay.mandateRevokedFallback')).toBeInTheDocument();
  await waitFor(() => expect(fetchRoomState).toHaveBeenLastCalledWith(2, expect.any(AbortSignal)));
});

it('reconciles realtime terminal statistics with the authoritative HTTP snapshot', async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const channel = {
    listen: (name: string, callback: (event: unknown) => void) => { handlers.set(name, callback); },
    stopListening: vi.fn(),
  };
  vi.stubGlobal('Echo', {
    connectionStatus: () => 'connected',
    connector: { onConnectionChange: () => vi.fn() },
    private: () => channel, leave: vi.fn(),
  });
  const view = setup();
  await screen.findByText('Room 1: active');
  vi.mocked(fetchRoomState).mockResolvedValue(success({ ...active, status: 'solved', final_stats: stats }));
  await act(async () => {
    handlers.get('LevelTransitioned')?.({
      status: 'solved', message: 'Realtime result', room_patch: { status: 'solved' },
      stats: { ...stats, time_taken: 'Broadcast time', xp_awards: { 2: 900 } },
    });
  });
  await screen.findByText('12 minutes');
  expect(screen.getByText('Realtime result')).toBeInTheDocument();
  expect(screen.queryByText('Broadcast time')).not.toBeInTheDocument();
  expect(screen.getByText('pages.gameRoom.gameEndOverlay.xpGranted').parentElement).toHaveTextContent('0 / 900');
  view.unmount();
});
