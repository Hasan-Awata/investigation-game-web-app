import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncounterGroup, GameRoom, Level } from '@/types';
import CampaignPreview from './CampaignTab';
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
const openRequiredRequest = vi.fn();
const CampaignTab = () => <CampaignPreview onOpenRequiredRequest={openRequiredRequest} />;

describe('shared level preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.phase.activeGroup = null;
    mocks.phase.isInitiating = false;
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

  it('exposes the play action and blocks repeated activation while starting', () => {
    mocks.room.game_case!.zones![0].levels = [level('interrogation')];
    mocks.phase.initiatePhase.mockImplementation(() => undefined);
    const content = (room: GameRoom) => <RoomDataProvider room={room} accumulatedEvidences={[]} accumulatedCharacters={[]} refreshRoomData={vi.fn()}><CampaignTab /></RoomDataProvider>;
    const view = render(content(mocks.room));
    openZone();
    const start = screen.getByRole('button', { name: 'Start interrogation' });
    expect(start).toHaveAttribute('title', 'Start interrogation');
    expect(start).toHaveAttribute('aria-busy', 'false');
    expect(start.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(start.textContent).toBe('');
    fireEvent.click(start);
    expect(mocks.phase.initiatePhase).toHaveBeenCalledTimes(1);
    expect(mocks.phase.initiatePhase).toHaveBeenCalledWith(1, expect.any(Function));
    mocks.phase.isInitiating = true;
    view.rerender(content({ ...mocks.room }));
    const pending = screen.getByRole('button', { name: 'Starting…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    expect(pending).toHaveAttribute('title', 'Starting…');
    fireEvent.click(pending);
    expect(mocks.phase.initiatePhase).toHaveBeenCalledTimes(1);
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
    mocks.room.procedural_requests = [{ id: 20, request_type: 'financial_records', title: 'The lead' }];
    const { container } = render(<CampaignTab />);
    openZone();
    expect(background(container)?.className).not.toContain('blurred');
    expect(screen.queryByRole('button', { name: 'Show workspace' })).not.toBeInTheDocument();
    expect(screen.queryByText('Location content')).not.toBeInTheDocument();
    expect(background(container)?.className).toContain('gated-image');
    expect(screen.queryByText('Warrant required')).not.toBeInTheDocument();
    const lock = screen.getByRole('button', { name: 'Open required request' });
    expect(lock.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(lock.querySelector('svg')).toHaveAttribute('width', '42');
    expect(lock).toHaveAccessibleDescription('pages.gameRoom.evidence.board.requestTypes.financial_records');
    fireEvent.click(lock);
    expect(openRequiredRequest).toHaveBeenCalledWith(20);
    expect(screen.queryByRole('button', { name: 'Start interrogation' })).not.toBeInTheDocument();
    expect(mocks.phase.initiatePhase).not.toHaveBeenCalled();
    expect(mocks.phase.joinGroup).not.toHaveBeenCalled();
  });

  it('uses authoritative completed request IDs to open an approved procedural gate', () => {
    mocks.room.game_case!.zones![0].levels = [{ ...level('interrogation'), required_request_id: 20 }];
    mocks.room.completed_requests = [{ id: 20 }];
    render(<CampaignTab />);
    openZone();
    expect(screen.getByRole('button', { name: 'Start interrogation' })).toBeEnabled();
    expect(screen.queryByText('Warrant required')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open required request' })).not.toBeInTheDocument();
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

  it('updates location card completion from inspections including dead ends in every open scene', () => {
    const location: Level = { ...level('location'), questions: [
      { id: 10, level_id: 1, text: 'First scene', choices: [{ id: 101, question_id: 10, text: '10,20 | Point' }] },
      { id: 20, level_id: 1, text: 'Second scene', choices: [{ id: 201, question_id: 20, text: '10,20 | Point' }] },
    ] };
    mocks.room.game_case!.zones![0].levels = [location];
    mocks.room.completed_levels = [location];
    mocks.room.inspections = [{ room_id: 1, choice_id: 101, is_dead_end: false }];
    const content = (room: GameRoom) => <RoomDataProvider room={room} accumulatedEvidences={[]} accumulatedCharacters={[]} refreshRoomData={vi.fn()}><CampaignTab /></RoomDataProvider>;
    const view = render(content(mocks.room));
    openZone();
    expect(screen.queryByRole('button', { name: /The lead.*Completed/ })).not.toBeInTheDocument();
    view.rerender(content({ ...mocks.room, inspections: [...mocks.room.inspections, { room_id: 1, choice_id: 201, is_dead_end: true }] }));
    expect(screen.getByRole('button', { name: /The lead.*Completed/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Show workspace' }));
    expect(screen.getByText('Location content')).toBeInTheDocument();
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

describe('lead navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.phase.activeGroup = null;
    mocks.phase.isInitiating = false;
    mocks.room = { id: 1, case_id: 1, host_user_id: 1, invite_code: 'TEST', status: 'active', strikes: 0,
      game_case: { id: 1, title: 'Case', story: '', min_player_XP: 0, XP_on_solve: 10, max_strikes: 3,
        zones: [{ id: 1, case_id: 1, title: 'District', order_index: 1, levels: [level('location'), { ...level('location'), id: 2, title: 'Second lead', details: 'Second details', order_index: 2 }] }] } };
  });
  it('switches leads, resets workspace, and returns to the map', () => {
    render(<CampaignTab />);
    openZone();
    fireEvent.click(screen.getByRole('button', { name: 'Show workspace' }));
    fireEvent.click(screen.getByRole('button', { name: /Second lead/ }));
    expect(screen.getByText('Second details')).toBeInTheDocument();
    expect(screen.queryByText('Location content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Second lead/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /backToMap/ }));
    expect(screen.getByRole('button', { name: 'Enter zone' })).toBeInTheDocument();
  });
  it('disables lead selection and map return during an active encounter', () => {
    mocks.phase.activeGroup = group;
    render(<CampaignTab />);
    expect(screen.getByRole('button', { name: /Second lead/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /backToMap/ })).toBeDisabled();
    expect(screen.getByText('Lead details')).toBeInTheDocument();
  });
  it('shows an empty zone with a working return action', () => {
    mocks.room.game_case!.zones![0].levels = [];
    render(<CampaignTab />);
    openZone();
    expect(screen.getByText('No leads are currently available in this zone.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /backToMap/ }));
    expect(screen.getByRole('button', { name: 'Enter zone' })).toBeInTheDocument();
  });
});
