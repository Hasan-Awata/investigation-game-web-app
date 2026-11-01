import { render, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import GameRoom from './GameRoom';
import type { ConnectionStatus } from 'laravel-echo';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), patch: vi.fn() }));
vi.mock('react-router-dom', () => ({ useParams: () => ({ inviteCode: 'ABC123' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useGameRoom', () => ({ useGameRoom: () => ({
  room: { id: 1, invite_code: 'ABC123', status: 'active' },
  refreshRoomData: mocks.refresh, patchRoomData: mocks.patch,
}) }));
vi.mock('@/hooks/useViewedItems', () => ({ useViewedItems: () => ({ viewedItems: new Set(), markItemAsViewed: vi.fn() }) }));
vi.mock('./GameRoomLayout', () => ({ default: () => null }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('refreshes once per visible socket reconnection and removes connection and room listeners', () => {
  let connectionChanged: (status: ConnectionStatus) => void = () => undefined;
  const unsubscribe = vi.fn();
  const events = new Map<string, (event: unknown) => void>();
  const channel = { listen: vi.fn((name: string, callback: (event: unknown) => void) => { events.set(name, callback); }), stopListening: vi.fn() };
  const leave = vi.fn();
  vi.stubGlobal('Echo', {
    connectionStatus: () => 'connected',
    connector: { onConnectionChange: (callback: typeof connectionChanged) => { connectionChanged = callback; return unsubscribe; } },
    private: () => channel, leave,
  });
  const view = render(<GameRoom />);
  act(() => {
    connectionChanged('disconnected');
    connectionChanged('connected');
    connectionChanged('connected');
  });
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  act(() => events.get('LevelTransitioned')?.({ status: 'solved' }));
  expect(mocks.refresh).toHaveBeenCalledTimes(2);
  act(() => events.get('EncounterGroupUpdated')?.({ room_id: 1, status: 'completed', members: [], required_voter_ids: [] }));
  expect(mocks.refresh).toHaveBeenCalledTimes(3);
  view.unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(leave).toHaveBeenCalledWith('room.1');
  expect(channel.stopListening).toHaveBeenCalledTimes(7);
});
