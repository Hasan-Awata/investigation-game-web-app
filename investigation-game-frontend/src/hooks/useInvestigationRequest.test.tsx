import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useInvestigationRequest } from './useInvestigationRequest';
import { submitInvestigationRequest, type InvestigationRequestResponse } from '@/services/api';
import { success, failure, type Result } from '@/utils/Result';
import type { Evidence, GameRoom, Level } from '@/types';

const { addGlobalToast, setGlobalFeedback } = vi.hoisted(() => ({ addGlobalToast: vi.fn(), setGlobalFeedback: vi.fn() }));
vi.mock('@/services/api', () => ({ submitInvestigationRequest: vi.fn() }));
vi.mock('@/context/RoomContext.shared', () => ({ useRoomUI: () => ({ addGlobalToast, setGlobalFeedback }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => vi.clearAllMocks());
const room: GameRoom = {
  id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0,
  procedural_requests: [
    { id: 10, title: 'Workshop', request_type: 'search_warrant' },
    { id: 11, title: 'Sample report', request_type: 'dna_test' },
  ],
};
const approved: InvestigationRequestResponse = { status: 'success', message: 'Approved', request_id: 10, unlocked_evidence: [], unlocked_levels: [] };

function setup(initialRoom = room) {
  const client = new QueryClient();
  client.setQueryData(['gameRoom', initialRoom.invite_code], initialRoom);
  const refresh = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(({ currentRoom }) => useInvestigationRequest(currentRoom, refresh), { wrapper, initialProps: { currentRoom: initialRoom } }), client, refresh };
}

function prepare(hook: ReturnType<typeof setup>) {
  act(() => {
    hook.result.current.selectRequest(10);
    hook.result.current.addEvidenceToTray(7);
    hook.result.current.addCharacterToTray(9);
  });
}

it('clears the selected request without discarding tray items', () => {
  const hook = setup();
  prepare(hook);
  act(() => hook.result.current.clearSelection());
  expect(hook.result.current.selectedRequestId).toBeNull();
  expect(hook.result.current.trayEvidences).toEqual([7]);
  expect(hook.result.current.trayCharacters).toEqual([9]);
  act(() => hook.result.current.submitRequest());
  expect(submitInvestigationRequest).not.toHaveBeenCalled();
});

it.each([
  { evidence: true, level: false, icons: ['proceduralApproved'] },
  { evidence: false, level: true, icons: ['warrantExecuted'] },
  { evidence: true, level: true, icons: ['proceduralApproved', 'warrantExecuted'] },
])('submits the selected request, marks approval only after success, and keeps notifications: $icons', async ({ evidence, level, icons }) => {
  vi.mocked(submitInvestigationRequest).mockResolvedValue(success({
    ...approved, unlocked_evidence: evidence ? [{ id: 7 } as Evidence] : [], unlocked_levels: level ? [{ id: 8 } as Level] : [],
  }));
  const hook = setup();
  prepare(hook);
  act(() => hook.result.current.submitRequest());
  expect(hook.client.getQueryData<GameRoom>(['gameRoom', room.invite_code])?.completed_requests).toBeUndefined();
  await waitFor(() => expect(hook.refresh).toHaveBeenCalledOnce());
  expect(submitInvestigationRequest).toHaveBeenCalledWith(room.id, { requestId: 10, evidenceIds: [7], characterIds: [9] });
  expect(hook.result.current.feedback).toBeNull();
  expect(hook.result.current.trayEvidences).toEqual([]);
  expect(hook.result.current.trayCharacters).toEqual([]);
  expect(hook.result.current.selectedRequestId).toBeNull();
  expect(hook.client.getQueryData<GameRoom>(['gameRoom', room.invite_code])?.completed_requests).toEqual([{ id: 10 }]);
  expect(setGlobalFeedback).not.toHaveBeenCalled();
  await waitFor(() => expect(addGlobalToast).toHaveBeenCalledTimes(icons.length));
  expect(addGlobalToast.mock.calls.map(([notice]) => notice.icon)).toEqual(icons);
});

it('keeps target and items after rejection, with no optimistic success or rollback of unrelated room updates', async () => {
  vi.mocked(submitInvestigationRequest).mockResolvedValue(failure('Request denied'));
  const hook = setup();
  prepare(hook);
  hook.client.setQueryData(['gameRoom', room.invite_code], { ...room, strikes: 2 });
  act(() => hook.result.current.submitRequest());
  await waitFor(() => expect(hook.result.current.feedback).toEqual({ type: 'error', message: 'Request denied' }));
  expect(hook.result.current.selectedRequestId).toBe(10);
  expect(hook.result.current.trayEvidences).toEqual([7]);
  expect(hook.result.current.trayCharacters).toEqual([9]);
  expect(hook.client.getQueryData<GameRoom>(['gameRoom', room.invite_code])?.strikes).toBe(2);
  expect(addGlobalToast).not.toHaveBeenCalled();
  act(() => hook.result.current.clearFeedback());
  expect(hook.result.current.feedback).toBeNull();
});

it('keeps items when switching, deduplicates drops, and clears selection after a teammate approves it', () => {
  const hook = setup();
  prepare(hook);
  act(() => { hook.result.current.selectRequest(11); hook.result.current.addEvidenceToTray(7); });
  expect(hook.result.current.selectedRequestId).toBe(11);
  expect(hook.result.current.trayEvidences).toEqual([7]);
  hook.rerender({ currentRoom: { ...room, completed_requests: [{ id: 11 }] } });
  expect(hook.result.current.selectedRequestId).toBeNull();
  expect(hook.result.current.trayEvidences).toEqual([7]);
  act(() => hook.result.current.selectRequest(11));
  expect(hook.result.current.selectedRequestId).toBeNull();
});

it('requires a visible pending selection and two items, and does not submit in a concluded room', () => {
  const hook = setup();
  act(() => { hook.result.current.selectRequest(999); hook.result.current.submitRequest(); });
  expect(hook.result.current.selectedRequestId).toBeNull();
  act(() => { hook.result.current.selectRequest(10); hook.result.current.addEvidenceToTray(7); });
  act(() => hook.result.current.submitRequest());
  act(() => hook.result.current.addCharacterToTray(9));
  hook.rerender({ currentRoom: { ...room, status: 'solved' } });
  act(() => hook.result.current.submitRequest());
  expect(submitInvestigationRequest).not.toHaveBeenCalled();
});

it('freezes inputs, snapshots the payload, and guards repeated clicks while pending', async () => {
  let resolve!: (result: Result<InvestigationRequestResponse>) => void;
  vi.mocked(submitInvestigationRequest).mockReturnValue(new Promise(done => { resolve = done; }));
  const hook = setup();
  prepare(hook);
  act(() => { hook.result.current.submitRequest(); hook.result.current.submitRequest(); });
  act(() => { hook.result.current.selectRequest(11); hook.result.current.removeItem(7, 'evidence'); hook.result.current.addEvidenceToTray(12); });
  await waitFor(() => expect(submitInvestigationRequest).toHaveBeenCalledOnce());
  expect(hook.result.current.selectedRequestId).toBe(10);
  expect(hook.result.current.trayEvidences).toEqual([7]);
  expect(hook.result.current.isSubmitting).toBe(true);
  await act(async () => resolve(success(approved)));
  expect(hook.result.current.isSubmitting).toBe(false);
});

it('resets drafts on room changes and ignores a late response from the previous room', async () => {
  let resolve!: (result: Result<InvestigationRequestResponse>) => void;
  vi.mocked(submitInvestigationRequest).mockReturnValue(new Promise(done => { resolve = done; }));
  const hook = setup();
  prepare(hook);
  act(() => hook.result.current.submitRequest());
  await waitFor(() => expect(submitInvestigationRequest).toHaveBeenCalledOnce());
  hook.rerender({ currentRoom: { ...room, id: 2, invite_code: 'NEXT12' } });
  act(() => hook.result.current.addEvidenceToTray(22));
  await act(async () => resolve(success(approved)));
  expect(hook.result.current.trayEvidences).toEqual([22]);
  expect(hook.result.current.selectedRequestId).toBeNull();
  expect(hook.refresh).not.toHaveBeenCalled();
});
