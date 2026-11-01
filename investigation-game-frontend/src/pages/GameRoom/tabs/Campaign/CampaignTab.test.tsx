import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncounterGroup, GameRoom, Level } from '@/types';
import CampaignTab from './CampaignTab';
import { RoomDataProvider } from '@/context/RoomContext';

const mocks = vi.hoisted(() => ({ room: {} as GameRoom, phase: {
  activeGroup: null as EncounterGroup | null,
  isInitiating: false, isJoining: false,
  initiatePhase: vi.fn(), joinGroup: vi.fn(),
} }));
vi.mock('@/context/RoomContext.shared', async importOriginal => {
  const original = await importOriginal<typeof import('@/context/RoomContext.shared')>();
  const { useContext } = await import('react');
  return { ...original, useRoomData: () => useContext(original.RoomDataContext) ?? { room: mocks.room } };
});
vi.mock('@/hooks/useInvestigationPhase', () => ({ useInvestigationPhase: () => mocks.phase }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }) }));
vi.mock('./CampaignMap', () => ({ default: ({ onEnterZone }: { onEnterZone: (id: number) => void }) => <button onClick={() => onEnterZone(1)}>Enter zone</button> }));
vi.mock('./Levels/Location/LocationPhase', () => ({ default: () => <div>Location content</div> }));
vi.mock('./Levels/Interrogation/InterrogationPhase', () => ({ default: () => <div>Interrogation content</div> }));

const level = (type: 'location' | 'interrogation'): Level => ({ id: 1, zone_id: 1, title: 'The lead', details: 'Lead details', img_url: '/scene.jpg', order_index: 1, is_initial: true, presentation_type: type });
const group: EncounterGroup = { id: 1, room_id: 1, level_id: 1, creator_user_id: 1, status: 'active', current_question_id: 1, finalizes_at: null };
const background = (container: HTMLElement) => container.querySelector('[style*="background-image"]');
const openZone = () => fireEvent.click(screen.getByRole('button', { name: 'Enter zone' }));

describe('shared level preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.phase.activeGroup = null;
    mocks.room = { id: 1, case_id: 1, host_user_id: 1, invite_code: 'TEST', status: 'active', strikes: 0,
      game_case: { id: 1, title: 'Case', story: '', min_player_XP: 0, XP_on_solve: 10, max_strikes: 3,
        zones: [{ id: 1, case_id: 1, title: 'District', order_index: 1, levels: [level('location')] }] } };
  });

  it('updates memoized zones when the room context receives a new snapshot', () => {
    const refresh = vi.fn();
    const content = (room: GameRoom) => <RoomDataProvider room={room} accumulatedEvidences={[]} accumulatedCharacters={[]} refreshRoomData={refresh}><CampaignTab /></RoomDataProvider>;
    const view = render(content(mocks.room));
    openZone();
    expect(screen.getByRole('heading', { name: 'District' })).toBeInTheDocument();
    const updatedRoom: GameRoom = { ...mocks.room, game_case: { ...mocks.room.game_case!, zones: [
      { ...mocks.room.game_case!.zones![0], title: 'Updated district', levels: [{ ...level('location'), details: 'Updated lead details' }] },
    ] } };
    view.rerender(content(updatedRoom));
    expect(screen.getByRole('heading', { name: 'Updated district' })).toBeInTheDocument();
    expect(screen.getByText('Updated lead details')).toBeInTheDocument();
    expect(screen.queryByText('Lead details')).not.toBeInTheDocument();
  });

  it('opens locations on sharp details and blurs only after swapping to content', () => {
    const { container } = render(<CampaignTab />);
    openZone();
    expect(screen.getByText('Lead details')).toBeInTheDocument();
    expect(screen.queryByText('Location content')).not.toBeInTheDocument();
    expect(background(container)?.className).not.toContain('blurred');
    fireEvent.click(screen.getByRole('button', { name: 'Show workspace' }));
    expect(screen.getByText('Location content')).toBeInTheDocument();
    expect(background(container)?.className).toContain('blurred');
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByText('Lead details')).toBeInTheDocument();
    expect(background(container)?.className).not.toContain('blurred');
  });

  it('starts an interrogation before opening its blurred content, then offers swap', () => {
    mocks.room.game_case!.zones![0].levels = [level('interrogation')];
    mocks.phase.initiatePhase.mockImplementation((_id: number, onStarted: () => void) => { mocks.phase.activeGroup = group; onStarted(); });
    const { container } = render(<CampaignTab />);
    openZone();
    expect(background(container)?.className).not.toContain('blurred');
    expect(screen.queryByRole('button', { name: 'Show workspace' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start interrogation' }));
    expect(screen.getByText('Interrogation content')).toBeInTheDocument();
    expect(background(container)?.className).toContain('blurred');
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByText('Lead details')).toBeInTheDocument();
    expect(background(container)?.className).not.toContain('blurred');
    expect(screen.queryByRole('button', { name: 'Start interrogation' })).not.toBeInTheDocument();
  });

  it('keeps the preview sharp when starting fails', () => {
    mocks.room.game_case!.zones![0].levels = [level('interrogation')];
    mocks.phase.initiatePhase.mockImplementation(() => undefined);
    const { container } = render(<CampaignTab />);
    openZone();
    fireEvent.click(screen.getByRole('button', { name: 'Start interrogation' }));
    expect(screen.getByText('Lead details')).toBeInTheDocument();
    expect(background(container)?.className).not.toContain('blurred');
  });

  it('resumes an existing interrogation through swap without starting again', () => {
    mocks.room.game_case!.zones![0].levels = [level('interrogation')];
    mocks.phase.activeGroup = group;
    const { container } = render(<CampaignTab />);
    expect(screen.getByText('Lead details')).toBeInTheDocument();
    expect(background(container)?.className).not.toContain('blurred');
    fireEvent.click(screen.getByRole('button', { name: 'Show workspace' }));
    expect(screen.getByText('Interrogation content')).toBeInTheDocument();
    expect(mocks.phase.initiatePhase).not.toHaveBeenCalled();
  });

  it('keeps gated previews sharp without exposing content', () => {
    mocks.room.game_case!.zones![0].levels = [{ ...level('location'), required_request_id: 20 }];
    const { container } = render(<CampaignTab />);
    openZone();
    expect(background(container)?.className).not.toContain('blurred');
    expect(screen.queryByRole('button', { name: 'Show workspace' })).not.toBeInTheDocument();
    expect(screen.queryByText('Location content')).not.toBeInTheDocument();
  });

  it('uses authoritative completed request IDs to open an approved procedural gate', () => {
    mocks.room.game_case!.zones![0].levels = [{ ...level('interrogation'), required_request_id: 20 }];
    mocks.room.completed_requests = [{ id: 20 }];
    render(<CampaignTab />);
    openZone();
    expect(screen.getByRole('button', { name: 'Start interrogation' })).toBeEnabled();
  });

  it('does not infer request completion from a similarly filed combination', () => {
    mocks.room.game_case!.zones![0].levels = [{ ...level('interrogation'), required_request_id: 20 }];
    mocks.room.completed_requests = [{ id: 21 }];
    render(<CampaignTab />);
    openZone();
    expect(screen.queryByRole('button', { name: 'Start interrogation' })).not.toBeInTheDocument();
  });

  it('opens a newly joined interrogation as content with the same blur behavior', () => {
    mocks.room.game_case!.zones![0].levels = [level('interrogation')];
    mocks.room.encounter_groups = [group];
    mocks.phase.joinGroup.mockImplementation((_id: number, onJoined: () => void) => { mocks.phase.activeGroup = group; onJoined(); });
    const { container } = render(<CampaignTab />);
    openZone();
    fireEvent.click(screen.getByRole('button', { name: 'Join encounter' }));
    expect(screen.getByText('Interrogation content')).toBeInTheDocument();
    expect(background(container)?.className).toContain('blurred');
    expect(mocks.phase.initiatePhase).not.toHaveBeenCalled();
  });

  it('opens completed interrogation history through swap', () => {
    mocks.room.game_case!.zones![0].levels = [level('interrogation')];
    mocks.room.completed_levels = [level('interrogation')];
    render(<CampaignTab />);
    openZone();
    fireEvent.click(screen.getByRole('button', { name: 'Show workspace' }));
    expect(screen.getByText('Interrogation content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start interrogation' })).not.toBeInTheDocument();
  });
});
