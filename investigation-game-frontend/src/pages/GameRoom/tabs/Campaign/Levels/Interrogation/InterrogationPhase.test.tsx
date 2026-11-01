import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { RoomDataProvider } from '@/context/RoomContext';
import type { GameRoom, Level } from '@/types';
import InterrogationPhase from './InterrogationPhase';

const { getLocalUserMock, useInvestigationPhaseMock } = vi.hoisted(() => ({
  getLocalUserMock: vi.fn(),
  useInvestigationPhaseMock: vi.fn(),
}));

vi.mock('@/utils/userState', () => ({ getLocalUser: getLocalUserMock }));
vi.mock('@/hooks/useInvestigationPhase', () => ({ useInvestigationPhase: useInvestigationPhaseMock }));

const questionId = 31;
const level: Level = {
  id: 8,
  title: 'Interview',
  questions: [{
    id: questionId,
    level_id: 8,
    text: 'Where were you?',
    choices: [
      { id: 101, question_id: questionId, text: 'At home' },
      { id: 102, question_id: questionId, text: 'At work' },
    ],
  }],
} as Level;

const renderPhase = (roomOverrides: Partial<GameRoom> = {}, displayedLevel = level) => {
  const room: GameRoom = {
    id: 4,
    invite_code: 'ROOM4',
    case_id: 2,
    host_user_id: 11,
    status: 'active',
    strikes: 0,
    accumulated_evidences: [],
    ...roomOverrides,
  };
  return render(
    <RoomDataProvider
      room={room}
      accumulatedEvidences={[]}
      accumulatedCharacters={[]}
      refreshRoomData={vi.fn()}
    >
      <InterrogationPhase level={displayedLevel} />
    </RoomDataProvider>,
  );
};

describe('InterrogationPhase', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    getLocalUserMock.mockReturnValue({ id: 11, name: 'Creator' });
    useInvestigationPhaseMock.mockReturnValue({
      activeGroup: {
        id: 7,
        room_id: 4,
        level_id: level.id,
        creator_user_id: 11,
        status: 'active',
        current_question_id: questionId,
        finalizes_at: null,
        members: [
          { user_id: 11, joined_at: '2026-01-01T00:00:00Z', user: { name: 'Creator' } },
          { user_id: 12, joined_at: '2026-01-01T00:00:00Z', user: { name: 'Analyst' } },
        ],
        required_voter_ids: [11, 12],
        votes: [{ id: 1, room_id: 4, encounter_group_id: 7, user_id: 11, question_id: questionId, choice_id: 101 }],
        tally: { 101: 2 },
      },
      localVotes: { [questionId]: 101 },
      isSubmitting: false,
      handleSelectChoice: vi.fn(),
      clearVote: vi.fn(),
    });
  });

  it('shows the server tally and roster vote readiness, and exposes change and clear actions', () => {
    renderPhase();

    expect(screen.getByText('Where were you?')).toBeInTheDocument();
    expect(screen.getByText('Creator: Submitted: At home')).toBeInTheDocument();
    expect(screen.getByText('Analyst: Waiting for vote')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /At home/ })).toHaveTextContent('(2)');
    expect(screen.getByRole('button', { name: /At work/ })).toHaveTextContent('(0)');
    expect(screen.getByRole('button', { name: 'Clear my vote' })).toBeEnabled();
  });

  it('shows a server-reported tie without showing a countdown', () => {
    useInvestigationPhaseMock.mockReturnValueOnce({
      ...useInvestigationPhaseMock(),
      activeGroup: {
        ...useInvestigationPhaseMock().activeGroup,
        finalizes_at: null,
        tally: { 101: 2, 102: 2 },
      },
    });
    renderPhase();
    expect(screen.getByText('The vote is tied. Change a vote to break the tie.')).toBeInTheDocument();
  });

  it('renders the countdown from the server deadline', () => {
    useInvestigationPhaseMock.mockReturnValueOnce({
      ...useInvestigationPhaseMock(),
      activeGroup: {
        ...useInvestigationPhaseMock().activeGroup,
        finalizes_at: new Date(Date.now() + 6000).toISOString(),
        tally: { 101: 3 },
      },
    });
    renderPhase();
    expect(screen.getByText(/Finalizing in \d+ seconds/)).toBeInTheDocument();
  });

  it('prevents a late joiner from voting on the open question', () => {
    getLocalUserMock.mockReturnValue({ id: 12, name: 'Analyst' });
    useInvestigationPhaseMock.mockReturnValueOnce({
      ...useInvestigationPhaseMock(),
      localVotes: {},
      activeGroup: { ...useInvestigationPhaseMock().activeGroup, required_voter_ids: [11] },
    });
    renderPhase();
    expect(screen.getByText('You will vote starting with the next question.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /At home/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /At work/ })).toBeDisabled();
  });

  it('restores resolved exchanges in order before the current question without treating pending votes as history', () => {
    const earlierQuestions = [
      { id: 20, level_id: level.id, text: 'First prompt', choices: [{ id: 90, question_id: 20, text: 'Approved answer' }, { id: 91, question_id: 20, text: 'Rejected alternative' }] },
      { id: 21, level_id: level.id, text: 'Second prompt', choices: [{ id: 92, question_id: 21, text: 'Second answer' }] },
    ];
    const { container } = renderPhase({ question_resolutions: [
      { id: 2, room_id: 4, level_id: level.id, question_id: 21, choice_id: 92, encounter_group_id: 7, resolved_at: '2026-01-01T00:00:10Z' },
      { id: 1, room_id: 4, level_id: level.id, question_id: 20, choice_id: 90, encounter_group_id: 6, resolved_at: '2026-01-01T00:00:05Z' },
      { id: 3, room_id: 4, level_id: 99, question_id: 20, choice_id: 91, encounter_group_id: 8, resolved_at: '2026-01-01T00:00:11Z' },
    ] }, { ...level, questions: [...earlierQuestions, ...level.questions!] });

    expect(Array.from(container.querySelectorAll('p')).slice(0, 5).map(item => item.textContent)).toEqual([
      'First prompt', 'Approved answer', 'Second prompt', 'Second answer', 'Where were you?',
    ]);
    expect(screen.queryByText('Rejected alternative')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /At home/ })).toBeEnabled();
  });

  it('keeps saved conversation readable after completion without an active group or voting controls', () => {
    useInvestigationPhaseMock.mockReturnValue({ ...useInvestigationPhaseMock(), activeGroup: null });
    renderPhase({ question_resolutions: [
      { id: 1, room_id: 4, level_id: level.id, question_id: questionId, choice_id: 101, encounter_group_id: 7, resolved_at: '2026-01-01T00:00:05Z' },
    ] });

    expect(screen.getByText('Where were you?')).toBeInTheDocument();
    expect(screen.getByText('At home')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('At work')).not.toBeInTheDocument();
  });
});
