import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { RoomDataProvider } from '@/context/RoomContext';
import type { GameRoom, Level } from '@/types';
import LocationPhase from './LocationPhase';

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
          <LocationPhase level={level} />
        </RoomDataProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /inspect location/i }));
    fireEvent.click(screen.getByText('Evidence cache'));

    await waitFor(() => expect(inspectLocationMock).toHaveBeenCalledWith(room.id, 501));
    expect(inspectLocationMock).toHaveBeenCalledTimes(1);
  });
});
