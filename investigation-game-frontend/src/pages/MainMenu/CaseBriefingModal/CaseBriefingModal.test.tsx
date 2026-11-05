import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import type { GameCase, GameRoom } from '@/types';
import { failure, success } from '@/utils/Result';
import type { Result } from '@/utils/Result';
import CaseBriefingModal from './CaseBriefingModal';
import CaseCard from '../CaseCard/CaseCard';

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

afterEach(() => vi.unstubAllGlobals());

function renderBriefing(selectedCase = gameCase) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const close = vi.fn();
  const { unmount } = render(<QueryClientProvider client={client}><CaseBriefingModal gameCase={selectedCase} onClose={close} /></QueryClientProvider>);
  return { client, close, unmount };
}

it('copies the case briefing link without exposing the active room invite', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  renderBriefing();

  fireEvent.click(screen.getByRole('button', { name: 'Share case' }));

  expect(await screen.findByText('Case link copied')).toBeVisible();
  expect(writeText).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/?case=7`);
});

it('retains a favorite when the briefing is reopened and lets the player remove it', () => {
  const { unmount } = renderBriefing();
  fireEvent.click(screen.getByRole('button', { name: 'Favorite case', pressed: false }));
  unmount();

  renderBriefing();
  fireEvent.click(screen.getByRole('button', { name: 'Favorite case', pressed: true }));
  expect(screen.getByRole('button', { name: 'Favorite case', pressed: false })).toBeVisible();
});

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


it.each([
  undefined, 'solved_perfect', 'solved_partial', 'failed_no_proof', 'failed_incomplete', 'failed_strikes',
] as const)('shows only server completion XP and free price for %s without gateway XP', status => {
  renderBriefing({ ...gameCase, min_player_XP: 9876, user_status: status });
  const rewardValue = screen.getByText('100');
  expect(rewardValue).toHaveTextContent(/^100$/);
  const rewardItem = rewardValue.parentElement!;
  expect(rewardItem.parentElement!.children).toHaveLength(7);
  expect(rewardItem.parentElement!.firstElementChild).toHaveTextContent('System');
  expect(rewardItem.parentElement!.children[5]).toBe(rewardItem);
  expect(rewardItem.nextElementSibling).toHaveTextContent('Free');
  expect(screen.queryByText(/9876/)).not.toBeInTheDocument();
});

it('localizes the free price placeholder in Arabic', async () => {
  await i18n.changeLanguage('ar');
  renderBriefing();
  expect(screen.getByText('مجانية')).toBeVisible();
  expect(screen.queryByText('Free')).not.toBeInTheDocument();
});


it.each(['en', 'ar'])('shows localized free pricing on the menu card in %s without changing its base reward', async language => {
  await i18n.changeLanguage(language);
  render(<CaseCard gameCase={{ ...gameCase, difficulty: 'Hard', user_status: 'solved_perfect' }} />);
  expect(screen.getByText(language === 'ar' ? 'مجانية' : 'Free')).toBeVisible();
  expect(screen.getByText('100')).toBeVisible();
  expect(screen.getByText('Hard')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Glasshouse' })).toBeEnabled();
});


it.each([
  [3.77, '3.5 out of 5 stars', 3, 1],
  [2.22, '2.5 out of 5 stars', 2, 1],
  [4, '4 out of 5 stars', 4, 0],
  [5, '5 out of 5 stars', 5, 0],
  [undefined, 'Unrated', 0, 0],
  [0, 'Unrated', 0, 0],
  [NaN, 'Unrated', 0, 0],
  [6, 'Unrated', 0, 0],
] as const)('shows a shared five-star rating for %s', (rating, label, full, half) => {
  const selectedCase = { ...gameCase, rating_stars: rating };
  renderBriefing(selectedCase);
  render(<CaseCard gameCase={selectedCase} />);
  const groups = screen.getAllByRole('img', { name: label });
  expect(groups).toHaveLength(2);
  for (const group of groups) {
    expect(group.querySelectorAll('svg')).toHaveLength(5);
    expect(group.querySelectorAll('polygon[fill="currentColor"][stroke]')).toHaveLength(full);
    expect(group.querySelectorAll('polygon[fill="currentColor"]:not([stroke])')).toHaveLength(half);
    expect(group.textContent).toBe('');
  }
});
