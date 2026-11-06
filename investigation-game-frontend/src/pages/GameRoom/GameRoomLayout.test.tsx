import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RoomDataProvider, RoomUIProvider } from '@/context/RoomContext';
import type { Character, Evidence, GameRoom } from '@/types';
import GameRoomLayout from './GameRoomLayout';

const handlers = vi.hoisted(() => ({
  addEvidenceToTray: vi.fn(),
  addCharacterToTray: vi.fn(),
  handleCharacterDrop: vi.fn(),
}));
let dnd: DndContextProps;

vi.mock('@dnd-kit/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@dnd-kit/core')>(),
  DndContext: (props: DndContextProps) => {
    dnd = props;
    return props.children;
  },
}));
vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/hooks/useRoomPageHide', () => ({ useRoomPageHide: vi.fn() }));
vi.mock('@/hooks/useLeaveRoom', () => ({ useLeaveRoom: () => ({ isPending: false }) }));
vi.mock('@/hooks/useInvestigationRequest', () => ({
  useInvestigationRequest: () => ({
    trayEvidences: [], trayCharacters: [], filedRequests: [], requestType: '',
    addEvidenceToTray: handlers.addEvidenceToTray,
    addCharacterToTray: handlers.addCharacterToTray,
  }),
}));
vi.mock('@/hooks/useSuspectVerdict', () => ({
  useSuspectVerdict: () => ({ guiltyIds: [], handleCharacterDrop: handlers.handleCharacterDrop }),
}));
vi.mock('./tabs/Campaign/CampaignTab', () => ({
  default: function CampaignFixture() {
    const [visits, setVisits] = useState(0);
    return <button onClick={() => setVisits(visits + 1)}>Lead visits: {visits}</button>;
  },
}));

const room: GameRoom = { id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };
const evidence: Evidence = {
  id: 7, case_id: 1, title: 'Recovered recording', evidence_type: 'audio', is_initial: true, is_vital_for_conviction: false,
};
const character: Character = { id: 9, case_id: 1, name: 'Avery', is_initial: true, default_status: 'alive' };
const noop = () => undefined;

function renderLayout() {
  return render(
    <MemoryRouter>
      <RoomDataProvider room={room} accumulatedEvidences={[evidence]} accumulatedCharacters={[character]} refreshRoomData={async () => {}}>
        <RoomUIProvider
          viewedEvidences={new Set()}
          viewedCharacters={new Set()}
          globalFeedback={null}
          markEvidenceAsViewed={noop}
          markCharacterAsViewed={noop}
          setGameOverData={noop}
          addGlobalToast={noop}
          setGlobalFeedback={noop}
        >
          <GameRoomLayout resolutionMessage={null} finalStats={null} toasts={[]} />
        </RoomUIProvider>
      </RoomDataProvider>
    </MemoryRouter>
  );
}

function startDrag(source: HTMLElement, id: number | string, data: Record<string, unknown>,
  activatorEvent: Event = new PointerEvent('pointerdown', { pointerId: 1 })) {
  source.dispatchEvent(activatorEvent);
  const event: DragEndEvent = {
    active: { id, data: { current: data }, rect: { current: { initial: null, translated: null } } },
    activatorEvent,
    collisions: null,
    delta: { x: 0, y: 0 },
    over: null,
  };
  act(() => dnd.onDragStart?.(event));
  return event;
}

function dropOn(event: DragEndEvent, id: string) {
  const over = { id, rect: new DOMRect(), disabled: false, data: { current: undefined } };
  act(() => dnd.onDragEnd?.({ ...event, over }));
}

const button = (name: string) => screen.getByRole('button', { name });
const trayButton = () => button('pages.gameRoom.evidence.board.proceduralTrayTitle');

function movePointer(x: number, y: number, pointerId = 1) {
  fireEvent(document, new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId }));
}

function touchEvent(type: string, identifier: number, clientX: number, clientY: number) {
  return new TouchEvent(type, { changedTouches: [{ identifier, clientX, clientY } as Touch] });
}

it('opens the procedural tray during a drag and sends evidence and characters to their drop destinations', () => {
  renderLayout();
  fireEvent.click(button('pages.gameRoom.layout.tabs.evidences'));
  fireEvent.click(button('gameRoom.collapsePanel'));
  expect(button('gameRoom.expandPanel')).toHaveAttribute('aria-expanded', 'false');
  vi.spyOn(screen.getByRole('complementary'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 64, 900));

  const title = screen.getByText(evidence.title);
  const card = title.closest<HTMLElement>('[aria-roledescription="draggable"]')!;
  const measure = vi.spyOn(card, 'getBoundingClientRect').mockImplementation(() => {
    expect(button('gameRoom.expandPanel')).toHaveAttribute('aria-expanded', 'false');
    return new DOMRect(10, 20, 80, 40);
  });
  const evidenceDrag = startDrag(title, evidence.id, { type: 'EVIDENCE' });
  expect(measure).toHaveBeenCalledOnce();
  expect(dnd.measuring?.draggable?.measure?.(card)).toMatchObject({ left: 10, top: 20, width: 80, height: 40 });
  movePointer(65, 100);
  movePointer(32, 100, 2);
  expect(button('gameRoom.expandPanel')).toBeDisabled();
  expect(trayButton()).toHaveAttribute('aria-pressed', 'false');
  movePointer(32, 100);
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('pages.gameRoom.evidence.board.dragAndDrop')).toBeVisible();
  expect(button('gameRoom.collapsePanel')).toBeDisabled();
  movePointer(400, 100);
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  dropOn(evidenceDrag, 'procedural-tray');
  expect(handlers.addEvidenceToTray).toHaveBeenCalledWith(evidence.id);
  expect(button('gameRoom.collapsePanel')).toBeEnabled();

  fireEvent.click(button('pages.gameRoom.layout.tabs.personsOfInterest'));
  const characterCard = screen.getByText(character.name);
  const startCharacterDrag = () => startDrag(characterCard, 'character-9', {
    type: 'CHARACTER', characterId: character.id, sourcePool: 'unassigned',
  });

  fireEvent.click(button('gameRoom.activeAgents'));
  dropOn(startCharacterDrag(), 'guilty-zone');
  dropOn(startCharacterDrag(), 'unassigned-zone');
  expect(trayButton()).toHaveAttribute('aria-pressed', 'false');

  const characterDrag = startCharacterDrag();
  movePointer(32, 100);
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  dropOn(characterDrag, 'procedural-tray');
  expect(handlers.addCharacterToTray).toHaveBeenCalledWith(character.id);
  expect(handlers.handleCharacterDrop).toHaveBeenNthCalledWith(1, character.id, 'guilty');
  expect(handlers.handleCharacterDrop).toHaveBeenNthCalledWith(2, character.id, 'unassigned');

  const canceledDrag = startCharacterDrag();
  expect(button('gameRoom.collapsePanel')).toBeDisabled();
  act(() => dnd.onDragCancel?.(canceledDrag));
  expect(button('gameRoom.collapsePanel')).toBeEnabled();
  expect(handlers.addCharacterToTray).toHaveBeenCalledOnce();
  expect(handlers.handleCharacterDrop).toHaveBeenCalledTimes(2);
});

it('reveals the collapsed top sidebar only for the touch that is dragging', () => {
  renderLayout();
  fireEvent.click(button('pages.gameRoom.layout.tabs.personsOfInterest'));
  fireEvent.click(button('gameRoom.collapsePanel'));
  vi.spyOn(screen.getByRole('complementary'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 56));

  const source = screen.getByText(character.name);
  const start = () => startDrag(source, 'character-9', { type: 'CHARACTER', characterId: character.id },
    touchEvent('touchstart', 1, 200, 200));
  const canceled = start();
  fireEvent(document, touchEvent('touchmove', 1, 200, 57));
  fireEvent(document, touchEvent('touchmove', 2, 200, 20));
  act(() => dnd.onDragCancel?.(canceled));
  fireEvent(document, touchEvent('touchmove', 1, 200, 20));
  expect(button('gameRoom.expandPanel')).toBeEnabled();
  expect(trayButton()).toHaveAttribute('aria-pressed', 'false');

  const revealed = start();
  fireEvent(document, touchEvent('touchmove', 1, 200, 20));
  act(() => dnd.onDragCancel?.(revealed));
  expect(button('gameRoom.collapsePanel')).toBeEnabled();
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  expect(handlers.addCharacterToTray).not.toHaveBeenCalled();
});

it('handles a pointer move that reaches the sidebar as the drag activates', () => {
  renderLayout();
  fireEvent.click(button('pages.gameRoom.layout.tabs.evidences'));
  fireEvent.click(button('gameRoom.collapsePanel'));
  vi.spyOn(screen.getByRole('complementary'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 64, 900));
  const source = screen.getByText(evidence.title);
  const down = new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerId: 1, clientX: 100, clientY: 100 });
  fireEvent(source, down);
  movePointer(32, 100);
  expect(button('gameRoom.expandPanel')).toBeEnabled();

  act(() => dnd.onDragStart?.({
    activatorEvent: down,
    active: { id: evidence.id, data: { current: { type: 'EVIDENCE' } }, rect: { current: { initial: null, translated: null } } },
  }));
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
});

it('shows unread indicators and preserves Campaign state when switching workspace tabs', () => {
  renderLayout();
  const navigation = within(screen.getByRole('navigation'));
  const unreadTitle = 'pages.gameRoom.layout.tabs.unreadIntel';
  expect(within(navigation.getByRole('button', { name: 'pages.gameRoom.layout.tabs.evidences' })).getByTitle(unreadTitle)).toBeVisible();
  expect(within(navigation.getByRole('button', { name: 'pages.gameRoom.layout.tabs.personsOfInterest' })).getByTitle(unreadTitle)).toBeVisible();
  expect(screen.queryByText('Lead visits: 0')).not.toBeInTheDocument();

  fireEvent.click(button('pages.gameRoom.layout.tabs.campaign'));
  fireEvent.click(button('Lead visits: 0'));
  fireEvent.click(button('pages.gameRoom.layout.tabs.caseDetails'));
  expect(screen.queryByRole('button', { name: 'Lead visits: 1' })).not.toBeInTheDocument();
  fireEvent.click(button('pages.gameRoom.layout.tabs.campaign'));
  expect(button('Lead visits: 1')).toBeVisible();
});
