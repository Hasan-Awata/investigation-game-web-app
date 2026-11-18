import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { RoomDataProvider, RoomUIProvider } from '@/context/RoomContext';
import type { GameRoom, Level } from '@/types';
import LocationPhase from './LocationPhase';
import { useState } from 'react';
import type { GlobalFeedback } from '@/context/RoomContext';

function FeedbackHarness({ sceneLevel = level }: { sceneLevel?: Level }) {
  const [feedback, setFeedback] = useState<GlobalFeedback | null>(null);
  return <RoomUIProvider viewedEvidences={new Set<number>()} viewedCharacters={new Set<number>()} markEvidenceAsViewed={vi.fn()} markCharacterAsViewed={vi.fn()} setGameOverData={vi.fn()} addGlobalToast={vi.fn()} globalFeedback={feedback} setGlobalFeedback={setFeedback}>
    {feedback && <div role="alert">{feedback.message}</div>}
    <LocationPhase level={sceneLevel} />
  </RoomUIProvider>;
}

const { inspectLocationMock } = vi.hoisted(() => ({ inspectLocationMock: vi.fn() }));
vi.mock('@/services/api', () => ({ inspectLocation: inspectLocationMock }));

const room: GameRoom = {
  id: 4,
  invite_code: 'ROOM4',
  case_id: 2,
  host_user_id: 11,
  status: 'active',
  management_trust: 100,
  available_location_point_ids: [501],
  inspections: [],
  votes: [],
};

const level: Level = {
  id: 8,
  title: 'Evidence Room',
  presentation_type: 'location',
  questions: [{
    id: 41,
    level_id: 8,
    text: 'A quiet evidence room.',
    choices: [{ id: 501, question_id: 41, text: '10,20 | Evidence cache' }],
  }],
} as Level;

describe('LocationPhase', () => {
  it.each(['Required procedure is incomplete.', 'This investigation has already concluded.'])('shows rejection feedback (%s) and permits a subsequent inspection without a false discovery', async (message) => {
    localStorage.setItem('auth_token', 'valid');
    inspectLocationMock.mockResolvedValueOnce({ isSuccess: false, status: 403, errorMessage: message });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><RoomDataProvider room={room} accumulatedEvidences={[]} accumulatedCharacters={[]} refreshRoomData={vi.fn()}><FeedbackHarness /></RoomDataProvider></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: /inspect location/i }));
    fireEvent.click(screen.getByText('Evidence cache'));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByText(i18n.t('pages.gameRoom.campaign.levels.location.foundUseful'))).not.toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBe('valid');
    expect(client.getQueryData(['gameRoom', room.invite_code])).toBeUndefined();
    fireEvent.click(screen.getByText('Evidence cache'));
    await waitFor(() => expect(inspectLocationMock).toHaveBeenCalledTimes(2));
  });
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
    inspectLocationMock.mockReset();
    inspectLocationMock.mockResolvedValue({
      isSuccess: true,
      value: { inspection: { id: 1, room_id: room.id, choice_id: 501, is_dead_end: false } },
    });
  });

  it('inspects a location point without submitting an ordinary encounter vote', async () => {
    const refreshRoomData = vi.fn().mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <RoomDataProvider
          room={room}
          accumulatedEvidences={[]}
          accumulatedCharacters={[]}
          refreshRoomData={refreshRoomData}
        >
          <RoomUIProvider viewedEvidences={new Set<number>()} viewedCharacters={new Set<number>()} markEvidenceAsViewed={vi.fn()} markCharacterAsViewed={vi.fn()} setGameOverData={vi.fn()} addGlobalToast={vi.fn()} globalFeedback={null} setGlobalFeedback={vi.fn()}><LocationPhase level={level} /></RoomUIProvider>
        </RoomDataProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /inspect location/i }));
    fireEvent.click(screen.getByText('Evidence cache'));

    await waitFor(() => expect(inspectLocationMock).toHaveBeenCalledWith(room.id, 501));
    expect(inspectLocationMock).toHaveBeenCalledTimes(1);
  });
});

function renderLocation(sceneRoom = room, sceneLevel = level) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><RoomDataProvider room={sceneRoom} accumulatedEvidences={[]} accumulatedCharacters={[]} refreshRoomData={vi.fn()}><FeedbackHarness sceneLevel={sceneLevel} /></RoomDataProvider></QueryClientProvider>);
}

describe('location workspace controls', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
    inspectLocationMock.mockReset();
  });

  it('focuses Close, contains tab navigation, and restores focus after Escape', () => {
    renderLocation();
    const opener = screen.getByRole('button', { name: 'Inspect location' });
    opener.focus();
    fireEvent.click(opener);
    const close = screen.getByRole('button', { name: 'Close viewer' });
    expect(close).toHaveFocus();
    const point = screen.getByRole('button', { name: 'Evidence cache' });
    point.focus();
    fireEvent.keyDown(point, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('bounds zoom and resets to the initial view', () => {
    renderLocation();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect location' }));
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    const zoom = screen.getByRole('button', { name: 'Zoom in' });
    for (let i = 0; i < 8; i++) fireEvent.click(zoom);
    expect(zoom).toBeDisabled();
    expect(screen.getByText('500%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeDisabled();
  });

  it('prevents duplicate inspections while pending', async () => {
    inspectLocationMock.mockReturnValue(new Promise(() => {}));
    renderLocation();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect location' }));
    const point = screen.getByRole('button', { name: 'Evidence cache' });
    fireEvent.click(point);
    await waitFor(() => expect(point).toBeDisabled());
    expect(point).toHaveAttribute('aria-busy', 'true');
    expect(point).toHaveAttribute('data-discovered', 'false');
    fireEvent.click(point);
    expect(inspectLocationMock).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('toggles saved inspection results without a request (dead end: %s)', deadEnd => {
    renderLocation({ ...room, inspections: [{ room_id: room.id, choice_id: 501, is_dead_end: deadEnd }] });
    fireEvent.click(screen.getByRole('button', { name: 'Inspect location' }));
    const point = screen.getByRole('button', { name: 'Evidence cache' });
    fireEvent.click(point);
    expect(within(point).getByRole('status')).toHaveTextContent(i18n.t('pages.gameRoom.campaign.levels.location.' + (deadEnd ? 'nothingFound' : 'foundUseful')));
    fireEvent.click(point);
    expect(point).toHaveAttribute('aria-expanded', 'false');
    expect(point).toHaveAttribute('data-discovered', 'true');
    expect(inspectLocationMock).not.toHaveBeenCalled();
  });

  it('omits unavailable points and handles missing scene data', () => {
    const view = renderLocation({ ...room, available_location_point_ids: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Inspect location' }));
    expect(screen.queryByRole('button', { name: 'Evidence cache' })).not.toBeInTheDocument();
    view.unmount();
    renderLocation(room, { ...level, questions: undefined });
    expect(screen.getByText('No scenes are open for inspection yet.')).toBeInTheDocument();
  });
});
