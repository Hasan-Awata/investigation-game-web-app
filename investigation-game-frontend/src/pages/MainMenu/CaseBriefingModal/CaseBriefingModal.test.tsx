import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import type { GameCase, GameRoom } from '@/types';
import { failure, success } from '@/utils/Result';
import type { Result } from '@/utils/Result';
import CaseBriefingModal from './CaseBriefingModal';

const mocks = vi.hoisted(() => ({ createRoom: vi.fn(), restartRoom: vi.fn(), navigate: vi.fn() }));
vi.mock('@/services/api', () => ({ createRoom: mocks.createRoom, restartRoom: mocks.restartRoom }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));

const gameCase: GameCase = {
  id: 7, title: 'Glasshouse', story: 'Investigate the case.', min_player_XP: 0,
  XP_on_solve: 100, max_strikes: 3, active_room_invite_code: 'OLD123',
};
const replacement = { id: 12, invite_code: 'NEW123' } as GameRoom;

beforeEach(async () => {
  vi.resetAllMocks();
  sessionStorage.clear();
  await i18n.changeLanguage('en');
});

function renderBriefing(selectedCase = gameCase) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const close = vi.fn();
  render(<QueryClientProvider client={client}><CaseBriefingModal gameCase={selectedCase} onClose={close} /></QueryClientProvider>);
  return { client, close };
}

it('requires confirmation without tab storage and cancelling or pressing Escape keeps the investigation', () => {
  const { close } = renderBriefing();
  fireEvent.click(screen.getByRole('button', { name: 'Restart Case' }));
  expect(screen.getByText(/Restarting adds no XP penalty/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Keep Current Investigation' })).toHaveFocus();
  expect(mocks.restartRoom).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Restart Case' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Restart Case' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep Current Investigation' }));
  expect(mocks.restartRoom).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue Investigation' }));
  expect(mocks.navigate).toHaveBeenCalledWith('/room/OLD123');
});

it('submits one restart, prevents dismissal while pending, and invalidates stale discovery', async () => {
  let finish: (result: Result<GameRoom>) => void = () => undefined;
  mocks.restartRoom.mockReturnValue(new Promise<Result<GameRoom>>(resolve => { finish = resolve; }));
  const { client, close } = renderBriefing();
  client.setQueryData(['cases'], [gameCase]);
  client.setQueryData(['gameRoom', 'OLD123'], { id: 5 });
  fireEvent.click(screen.getByRole('button', { name: 'Restart Case' }));
  const confirm = screen.getByRole('button', { name: 'Confirm Restart' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  fireEvent.click(screen.getByRole('dialog').parentElement!);
  expect(close).not.toHaveBeenCalled();
  expect(mocks.restartRoom).toHaveBeenCalledExactlyOnceWith(7, 'OLD123');
  expect(mocks.createRoom).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Keep Current Investigation' })).toBeDisabled();
  await act(async () => finish(success(replacement)));
  expect(mocks.navigate).toHaveBeenCalledWith('/room/NEW123');
  expect(client.getQueryData(['gameRoom', 'OLD123'])).toBeUndefined();
  expect(client.getQueryState(['cases'])?.isInvalidated).toBe(true);
});

it('keeps an actionable error and retries the same source after a failed or lost response', async () => {
  mocks.restartRoom.mockResolvedValueOnce(failure('Connection interrupted.')).mockResolvedValueOnce(success(replacement));
  renderBriefing();
  fireEvent.click(screen.getByRole('button', { name: 'Restart Case' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Restart' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted.');
  expect(mocks.navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Restart' }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/room/NEW123'));
  expect(mocks.restartRoom.mock.calls).toEqual([[7, 'OLD123'], [7, 'OLD123']]);
});

it('recovers from unexpected request errors and keeps cancellation available', async () => {
  mocks.restartRoom.mockRejectedValue(new Error('Unexpected transport error'));
  const { client, close } = renderBriefing();
  client.setQueryData(['cases'], [gameCase]);
  fireEvent.click(screen.getByRole('button', { name: 'Restart Case' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Restart' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to confirm the restart. Retry to open the same new investigation if it was already created.');
  expect(screen.getByRole('button', { name: 'Back to Case List' })).toBeEnabled();
  expect(client.getQueryState(['cases'])?.isInvalidated).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Back to Case List' }));
  expect(close).toHaveBeenCalledOnce();
});

it.each([undefined, 'solved_perfect'] as const)('keeps ordinary creation for previous result %s', async (status) => {
  mocks.createRoom.mockResolvedValue(success(replacement));
  renderBriefing({ ...gameCase, active_room_invite_code: undefined, user_status: status });
  fireEvent.click(screen.getByRole('button', { name: status ? 'Replay Case' : 'Start Case' }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/room/NEW123'));
  expect(mocks.createRoom).toHaveBeenCalledExactlyOnceWith(7);
  expect(mocks.restartRoom).not.toHaveBeenCalled();
});

it('shows the confirmation and cancellation in Arabic', async () => {
  await i18n.changeLanguage('ar');
  renderBriefing();
  fireEvent.click(screen.getByRole('button', { name: 'إعادة تشغيل القضية' }));
  expect(screen.getByRole('button', { name: 'تأكيد البدء من جديد' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'الاحتفاظ بالتحقيق الحالي' })).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('لا تفرض إعادة البدء عقوبة على نقاط الخبرة');
});
