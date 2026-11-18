import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { submitSuspectVerdict, type SubmitSuspectVerdictResponse } from '@/services/api';
import type { GameCase, GameRoom } from '@/types';
import { failure, success, type Result } from '@/utils/Result';
import { useSuspectVerdict } from './useSuspectVerdict';

vi.mock('@/services/api', () => ({ submitSuspectVerdict: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/context/RoomContext.shared', () => ({
  useRoomUI: () => ({ setGlobalFeedback: vi.fn(), addGlobalToast: vi.fn() }),
}));

const firstRoom: GameRoom = { id: 1, invite_code: 'FIRST', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };
const secondRoom = { ...firstRoom, id: 2, invite_code: 'SECOND' };
const storageKey = (room = firstRoom) => `room_${room.invite_code}_guilty_characters`;
const unassignedStorageKey = (room = firstRoom) => `room_${room.invite_code}_unassigned_characters`;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.mocked(submitSuspectVerdict).mockReset();
  vi.mocked(submitSuspectVerdict).mockResolvedValue(success({ status: 'success', message: 'Closed' }));
});

function setup(room = firstRoom) {
  const refresh = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const gameOver = vi.fn();
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(({ room }) => useSuspectVerdict(room, refresh, gameOver), { wrapper, initialProps: { room } });
  return { ...hook, refresh, gameOver };
}

function pendingResponse() {
  let resolve!: (result: Result<SubmitSuspectVerdictResponse>) => void;
  const promise = new Promise<Result<SubmitSuspectVerdictResponse>>(done => { resolve = done; });
  return { promise, resolve };
}

it('validates persisted IDs and retains IDs absent from the current character payload', () => {
  sessionStorage.setItem(storageKey(), JSON.stringify([8, '9', null, -1, 8, 99, 1.2]));
  const hook = setup();
  expect(hook.result.current.characterOrder.guilty).toEqual([8, 99]);
  expect(JSON.parse(sessionStorage.getItem(storageKey())!)).toEqual([8, 99]);
});

it.each(['{broken', '{"id":3}'])('recovers from corrupt or incompatible storage: %s', stored => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  sessionStorage.setItem(storageKey(), stored);
  expect(setup().result.current.characterOrder.guilty).toEqual([]);
  expect(warning).toHaveBeenCalled();
});

it('keeps rapid drops and restores both zone orders after remounting', () => {
  const hook = setup();
  act(() => {
    hook.result.current.handleCharacterDrop(1, 'guilty');
    hook.result.current.handleCharacterDrop(2, 'guilty');
    hook.result.current.handleCharacterDrop(1, 'guilty');
    hook.result.current.handleCharacterDrop(3, 'unassigned');
    hook.result.current.handleCharacterDrop(2, 'unassigned');
    hook.result.current.handleCharacterDrop(3, 'unassigned');
  });
  const finalOrder = { guilty: [1], unassigned: [2, 3] };
  expect(hook.result.current.characterOrder).toEqual(finalOrder);
  hook.unmount();
  expect(setup().result.current.characterOrder).toEqual(finalOrder);
});

it('keeps selection usable if persistence fails', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  const hook = setup();
  act(() => hook.result.current.handleCharacterDrop(1, 'guilty'));
  expect(hook.result.current.characterOrder.guilty).toEqual([1]);
  expect(warning).toHaveBeenCalled();
});

it('guards readiness inside the workflow before starting a request', () => {
  const room = { ...firstRoom, game_case: { zones: [{ levels: [
    { id: 1, is_initial: true, presentation_type: 'interrogation' },
  ] }] } as GameCase };
  const hook = setup(room);
  act(() => hook.result.current.submitVerdict());
  expect(submitSuspectVerdict).not.toHaveBeenCalled();
  expect(hook.result.current.isSubmitting).toBe(false);
});

it('locks duplicate submission synchronously and snapshots same-tick selections', async () => {
  const response = pendingResponse();
  vi.mocked(submitSuspectVerdict).mockReturnValue(response.promise);
  const hook = setup();
  act(() => {
    hook.result.current.handleCharacterDrop(1, 'guilty');
    hook.result.current.handleCharacterDrop(2, 'guilty');
    hook.result.current.submitVerdict();
    hook.result.current.submitVerdict();
    hook.result.current.handleCharacterDrop(1, 'unassigned');
  });
  await waitFor(() => expect(submitSuspectVerdict).toHaveBeenCalledExactlyOnceWith(1, [1, 2]));
  expect(hook.result.current.characterOrder.guilty).toEqual([2]);
  expect(hook.result.current.isSubmitting).toBe(true);
  await act(async () => response.resolve(failure('Offline')));
  expect(hook.result.current.isSubmitting).toBe(false);
});

it.each(['transport', 'assessment'])('retains selection after %s failure and permits acknowledgment and retry', async kind => {
  vi.mocked(submitSuspectVerdict).mockResolvedValueOnce(kind === 'transport'
    ? failure('Rejected') : success({ status: 'failed', message: 'Rejected' }));
  const hook = setup();
  act(() => { hook.result.current.handleCharacterDrop(3, 'guilty'); hook.result.current.submitVerdict(); });
  await waitFor(() => expect(hook.result.current.feedback?.message).toBe('Rejected'));
  expect(hook.result.current.isSubmitting).toBe(false);
  expect(hook.gameOver).not.toHaveBeenCalled();
  expect(hook.result.current.characterOrder.guilty).toEqual([3]);
  act(() => hook.result.current.clearFeedback());
  expect(hook.result.current.feedback).toBeNull();
  await waitFor(() => expect(hook.refresh).toHaveBeenCalled());
  act(() => hook.result.current.submitVerdict());
  await waitFor(() => expect(hook.gameOver).toHaveBeenCalledWith('Closed', undefined));
});

it('cleans only the originating room on success without repersisting cleared IDs', async () => {
  sessionStorage.setItem(storageKey(secondRoom), '[9]');
  sessionStorage.setItem(unassignedStorageKey(secondRoom), '[10]');
  const hook = setup();
  act(() => { hook.result.current.handleCharacterDrop(3, 'guilty'); hook.result.current.submitVerdict(); });
  await waitFor(() => expect(hook.gameOver).toHaveBeenCalledOnce());
  expect(sessionStorage.getItem(storageKey())).toBeNull();
  expect(sessionStorage.getItem(unassignedStorageKey())).toBeNull();
  expect(sessionStorage.getItem(storageKey(secondRoom))).toBe('[9]');
  expect(sessionStorage.getItem(unassignedStorageKey(secondRoom))).toBe('[10]');
  expect(hook.result.current.isSubmitting).toBe(false);
  act(() => hook.result.current.submitVerdict());
  expect(submitSuspectVerdict).toHaveBeenCalledOnce();
});

it('does not present refresh rejection as verdict rejection', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const hook = setup();
  hook.refresh.mockRejectedValue(new Error('Refresh offline'));
  act(() => hook.result.current.submitVerdict());
  await waitFor(() => expect(warning).toHaveBeenCalled());
  expect(hook.gameOver).toHaveBeenCalledOnce();
  expect(hook.result.current.feedback).toBeNull();
});

it.each(['success', 'failure'])('ignores a late %s after switching rooms while the new submission is pending', async kind => {
  const oldResponse = pendingResponse();
  const newResponse = pendingResponse();
  vi.mocked(submitSuspectVerdict).mockReturnValueOnce(oldResponse.promise).mockReturnValueOnce(newResponse.promise);
  sessionStorage.setItem(storageKey(secondRoom), '[9]');
  const hook = setup();
  act(() => { hook.result.current.handleCharacterDrop(3, 'guilty'); hook.result.current.submitVerdict(); });
  await waitFor(() => expect(submitSuspectVerdict).toHaveBeenCalledWith(1, [3]));
  hook.rerender({ room: secondRoom });
  expect(hook.result.current.characterOrder.guilty).toEqual([9]);
  expect(hook.result.current.isSubmitting).toBe(false);
  expect(hook.result.current.feedback).toBeNull();
  act(() => hook.result.current.submitVerdict());
  await waitFor(() => expect(submitSuspectVerdict).toHaveBeenCalledWith(2, [9]));
  await act(async () => oldResponse.resolve(kind === 'success'
    ? success({ status: 'success', message: 'Old result' }) : failure('Old error')));
  expect(hook.result.current.isSubmitting).toBe(true);
  expect(hook.result.current.feedback).toBeNull();
  expect(hook.gameOver).not.toHaveBeenCalled();
  expect(hook.refresh).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(storageKey(secondRoom))).toBe('[9]');
  await act(async () => newResponse.resolve(success({ status: 'success', message: 'New result' })));
  expect(hook.gameOver).toHaveBeenCalledExactlyOnceWith('New result', undefined);
});

it('ignores a response after unmount', async () => {
  const response = pendingResponse();
  vi.mocked(submitSuspectVerdict).mockReturnValue(response.promise);
  const hook = setup();
  act(() => hook.result.current.submitVerdict());
  await waitFor(() => expect(submitSuspectVerdict).toHaveBeenCalledOnce());
  hook.unmount();
  await act(async () => response.resolve(success({ status: 'success', message: 'Closed' })));
  expect(hook.gameOver).not.toHaveBeenCalled();
  expect(hook.refresh).not.toHaveBeenCalled();
});
