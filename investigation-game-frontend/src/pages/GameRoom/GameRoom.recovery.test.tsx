import { render, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import GameRoom from './GameRoom';
import type { ConnectionStatus } from 'laravel-echo';
import type { GameRoom as GameRoomState } from '@/types';

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
  act(() => events.get('RoomParticipantRemoved')?.({ room_id: 1 }));
  expect(mocks.refresh).toHaveBeenCalledTimes(4);
  view.unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(leave).toHaveBeenCalledWith('room.1');
  expect(new Set(channel.stopListening.mock.calls.map(([event]) => event))).toEqual(new Set(events.keys()));
});

it('merges request approvals idempotently and refreshes request availability when a level is discovered', () => {
  const events = new Map<string, (event: unknown) => void>();
  const channel = { listen: vi.fn((name: string, callback: (event: unknown) => void) => { events.set(name, callback); }), stopListening: vi.fn() };
  vi.stubGlobal('Echo', {
    connectionStatus: () => 'connected', connector: { onConnectionChange: () => vi.fn() },
    private: () => channel, leave: vi.fn(),
  });
  let state: GameRoomState = { id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };
  mocks.patch.mockImplementation((update: (room: GameRoomState) => GameRoomState) => { state = update(state); });
  render(<GameRoom />);
  const approval = { request_id: 10, filed_request: { id: 4, request_type: 'search_warrant', evidence_ids: [1, 2], character_ids: [], created_at: new Date().toISOString() } };
  act(() => { events.get('RequestFiled')?.(approval); events.get('RequestFiled')?.(approval); });
  expect(state.completed_requests).toEqual([{ id: 10 }]);
  expect(state.filed_requests).toHaveLength(1);
  act(() => events.get('ItemsUnlocked')?.({ unlocked_levels: [{ id: 5 }] }));
  expect(state.unlocked_levels?.map(level => level.id)).toEqual([5]);
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
