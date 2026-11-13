import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useInvestigationRequest } from './useInvestigationRequest';
import { submitInvestigationRequest } from '@/services/api';
import { success, failure } from '@/utils/Result';
import type { Evidence, GameRoom, Level } from '@/types';

const { addGlobalToast, setGlobalFeedback } = vi.hoisted(() => ({ addGlobalToast: vi.fn(), setGlobalFeedback: vi.fn() }));
vi.mock('@/services/api', () => ({ submitInvestigationRequest: vi.fn() }));
vi.mock('@/context/RoomContext.shared', () => ({ useRoomUI: () => ({ addGlobalToast, setGlobalFeedback }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => vi.clearAllMocks());
const room: GameRoom = { id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };

function setup() {
  const client = new QueryClient();
  client.setQueryData(['gameRoom', room.invite_code], room);
  const refresh = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(() => useInvestigationRequest(room, refresh), { wrapper }), client, refresh };
}

it.each([
  { evidence: true, level: false, icons: ['proceduralApproved'] },
  { evidence: false, level: true, icons: ['warrantExecuted'] },
  { evidence: true, level: true, icons: ['proceduralApproved', 'warrantExecuted'] },
])('accepts requests without an acknowledgement dialog and retains notifications: $icons', async ({ evidence, level, icons }) => {
  vi.mocked(submitInvestigationRequest).mockResolvedValue(success({
    status: 'success', message: 'Approved',
    unlocked_evidence: evidence ? [{ id: 7 } as Evidence] : [],
    unlocked_levels: level ? [{ id: 8 } as Level] : [],
  }));
  const hook = setup();
  act(() => { hook.result.current.addEvidenceToTray(7); hook.result.current.setRequestType('search'); });
  act(() => hook.result.current.submitRequest());
  await waitFor(() => expect(hook.refresh).toHaveBeenCalledOnce());
  expect(hook.result.current.feedback).toBeNull();
  expect(hook.result.current.trayEvidences).toEqual([]);
  expect(hook.result.current.requestType).toBe('');
  expect(setGlobalFeedback).not.toHaveBeenCalled();
  await waitFor(() => expect(addGlobalToast).toHaveBeenCalledTimes(icons.length));
  expect(addGlobalToast.mock.calls.map(([notice]) => notice.icon)).toEqual(icons);
  expect(addGlobalToast.mock.calls[0][0].message).toBe(evidence
    ? 'pages.gameRoom.hooks.request.proceduralApprovedMsg'
    : 'pages.gameRoom.hooks.request.warrantExecutedMsg');
});

it('retains rejection feedback, acknowledgement, and optimistic rollback without adding a toast', async () => {
  vi.mocked(submitInvestigationRequest).mockResolvedValue(failure('Request denied'));
  const hook = setup();
  act(() => hook.result.current.submitRequest());
  await waitFor(() => expect(hook.result.current.feedback).toEqual({ type: 'error', message: 'Request denied' }));
  expect(hook.client.getQueryData(['gameRoom', room.invite_code])).toEqual(room);
  expect(addGlobalToast).not.toHaveBeenCalled();
  expect(setGlobalFeedback).not.toHaveBeenCalled();
  act(() => hook.result.current.clearFeedback());
  expect(hook.result.current.feedback).toBeNull();
});
