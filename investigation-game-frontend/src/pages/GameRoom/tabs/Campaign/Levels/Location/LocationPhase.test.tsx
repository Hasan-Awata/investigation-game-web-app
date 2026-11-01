import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { RoomDataProvider, RoomUIProvider } from '@/context/RoomContext';
import type { GameRoom, Level } from '@/types';
import LocationPhase from './LocationPhase';
import { useState } from 'react';
import type { GlobalFeedback } from '@/context/RoomContext';

function FeedbackHarness() {
  const [feedback, setFeedback] = useState<GlobalFeedback | null>(null);
  return <RoomUIProvider viewedEvidences={new Set<number>()} viewedCharacters={new Set<number>()} markEvidenceAsViewed={vi.fn()} markCharacterAsViewed={vi.fn()} setGameOverData={vi.fn()} addGlobalToast={vi.fn()} globalFeedback={feedback} setGlobalFeedback={setFeedback}>
    {feedback && <div role="alert">{feedback.message}</div>}
    <LocationPhase level={level} />
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
  strikes: 0,
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
