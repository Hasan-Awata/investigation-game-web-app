import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RoomDataProvider, RoomUIProvider } from '@/context/RoomContext';
import type { Character, Evidence, GameRoom } from '@/types';
import GameRoomLayout from './GameRoomLayout';
import styles from './GameRoomLayout.module.css';

const handlers = vi.hoisted(() => ({
  addEvidenceToTray: vi.fn(),
  addCharacterToTray: vi.fn(),
  handleCharacterDrop: vi.fn(),
  selectRequest: vi.fn(),
  changeLanguage: vi.fn(),
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
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en', changeLanguage: handlers.changeLanguage } }),
}));
vi.mock('@/hooks/useRoomPageHide', () => ({ useRoomPageHide: vi.fn() }));
vi.mock('@/hooks/useLeaveRoom', () => ({ useLeaveRoom: () => ({ isPending: false }) }));
vi.mock('@/hooks/useInvestigationRequest', () => ({
  useInvestigationRequest: () => {
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
    return {
      trayEvidences: [], trayCharacters: [], completedRequestIds: [], selectedRequestId,
      proceduralRequests: [{ id: 20, title: 'Required report', request_type: 'search_warrant' }],
      addEvidenceToTray: handlers.addEvidenceToTray,
      addCharacterToTray: handlers.addCharacterToTray,
      clearSelection: () => setSelectedRequestId(null),
      selectRequest: (requestId: number) => {
        handlers.selectRequest(requestId);
        setSelectedRequestId(requestId);
      },
    };
  },
}));
vi.mock('@/hooks/useSuspectVerdict', () => ({
  useSuspectVerdict: () => ({ characterOrder: { guilty: [], unassigned: [] }, handleCharacterDrop: handlers.handleCharacterDrop }),
}));
vi.mock('./tabs/Campaign/CampaignTab', () => ({
  default: function CampaignFixture({ onOpenRequiredRequest }: { onOpenRequiredRequest: (id: number) => void }) {
    const [visits, setVisits] = useState(0);
    return <><button onClick={() => setVisits(visits + 1)}>Lead visits: {visits}</button>
      <button onClick={() => onOpenRequiredRequest(20)}>Open required request</button></>;
  },
}));

const room: GameRoom = { id: 1, invite_code: 'ABC123', case_id: 1, host_user_id: 1, status: 'active', strikes: 0 };
const evidence: Evidence = {
  id: 7, case_id: 1, title: 'Recovered recording', evidence_type: 'audio', is_initial: true, is_vital_for_conviction: false,
};
const character: Character = { id: 9, case_id: 1, name: 'Avery', is_initial: true, default_status: 'alive' };
const noop = () => undefined;

function roomLayout(currentRoom: GameRoom) {
  return (
    <MemoryRouter>
      <RoomDataProvider room={currentRoom} accumulatedEvidences={[evidence]} accumulatedCharacters={[character]} refreshRoomData={async () => {}}>
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

const renderLayout = () => render(roomLayout(room));

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
const requestDisclosure = () => button('pages.gameRoom.evidence.board.availableRequests');
const collapsedDragEdge = () => button('gameRoom.expandPanel').parentElement!
  .querySelector(`.${styles.sidebarDragEdge}`)!;

it('opens settings between the session actions without replacing the active sidebar tab', () => {
  renderLayout();
  const copy = button('gameRoom.copySessionCode');
  const settings = button('gameRoom.settings.title');
  const leave = button('pages.gameRoom.layout.tabs.returnToMenu');
  expect(Array.from(settings.parentElement!.children)).toEqual([copy, settings, leave]);
  expect(screen.getAllByRole('button', { name: 'gameRoom.settings.title' })).toHaveLength(1);
  expect(settings).toHaveAttribute('aria-haspopup', 'dialog');
  expect(settings).not.toHaveAttribute('aria-pressed');

  fireEvent.click(trayButton());
  fireEvent.click(requestDisclosure());
  fireEvent.click(settings);
  const dialog = screen.getByRole('dialog', { name: 'gameRoom.settings.title' });
  expect(within(dialog).getByText('gameRoom.settings.language')).toBeVisible();
  const close = within(dialog).getByRole('button', { name: 'gameRoom.settings.close' });
  expect(close).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'التبديل إلى العربية' }));
  expect(handlers.changeLanguage).toHaveBeenCalledWith('ar');
  fireEvent.click(close);
  expect(dialog).not.toBeInTheDocument();
  expect(settings).toHaveFocus();
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(settings);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(settings).toHaveFocus();
});

it('remembers both disclosure states while visiting a room and starts collapsed on a fresh visit', () => {
  const view = renderLayout();
  fireEvent.click(trayButton());
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(requestDisclosure());
  const target = screen.getByRole('button', { name: /Required report/ });
  fireEvent.click(target);
  const handle = button('gameRoom.collapsePanel');
  const sidebar = screen.getByRole('complementary');
  handle.focus();
  fireEvent.click(handle);
  expect(button('gameRoom.expandPanel')).toBe(handle);
  expect(handle).toHaveFocus();
  expect(handle).toHaveAttribute('aria-controls', sidebar.id);
  expect(sidebar).toHaveAttribute('inert');
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'gameRoom.settings.title' })).not.toBeInTheDocument();
  fireEvent.click(handle);
  expect(button('gameRoom.collapsePanel')).toBe(handle);
  expect(handle).toHaveFocus();
  expect(sidebar).not.toHaveAttribute('inert');
  expect(target).toHaveAttribute('aria-pressed', 'true');
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(button('gameRoom.activeAgents'));
  fireEvent.click(trayButton());
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(requestDisclosure());
  fireEvent.click(button('gameRoom.activeAgents'));
  fireEvent.click(trayButton());
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(requestDisclosure());
  view.unmount();

  const freshVisit = renderLayout();
  fireEvent.click(trayButton());
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(requestDisclosure());
  freshVisit.rerender(roomLayout({ ...room, id: 2, invite_code: 'DEF456' }));
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'false');
});

it('expands the sidebar and opens the tray with the required request selected from the map', () => {
  renderLayout();
  fireEvent.click(button('pages.gameRoom.layout.tabs.campaign'));
  fireEvent.click(button('gameRoom.collapsePanel'));
  fireEvent.click(button('Open required request'));
  expect(button('gameRoom.collapsePanel')).toHaveAttribute('aria-expanded', 'true');
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'true');
  const target = screen.getByRole('button', { name: /Required report/ });
  expect(target).toHaveAttribute('aria-pressed', 'true');
  expect(target).toHaveFocus();
  expect(handlers.selectRequest).toHaveBeenCalledWith(20);
  fireEvent.click(requestDisclosure());
  expect(screen.queryByText('Required report')).not.toBeInTheDocument();
  fireEvent.click(requestDisclosure());
  expect(screen.getByRole('button', { name: /Required report/ })).toHaveAttribute('aria-pressed', 'false');
});

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
  vi.spyOn(collapsedDragEdge(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 64, 900));

  const title = screen.getByText(evidence.title);
  const card = title.closest<HTMLElement>('[aria-roledescription="draggable"]')!;
  const measure = vi.spyOn(card, 'getBoundingClientRect').mockImplementation(() => {
    expect(button('gameRoom.expandPanel')).toHaveAttribute('aria-expanded', 'false');
    return new DOMRect(10, 20, 80, 40);
  });
  const evidenceDrag = startDrag(title, evidence.id, { type: 'EVIDENCE' });
  const dragLayout = (handle: HTMLElement) => handle.closest('[data-sidebar-drop-available]');
  expect(dragLayout(button('gameRoom.expandPanel'))).toHaveAttribute('data-sidebar-drop-available', 'true');
  expect(measure).toHaveBeenCalledOnce();
  expect(dnd.measuring?.draggable?.measure?.(card)).toMatchObject({ left: 10, top: 20, width: 80, height: 40 });
  movePointer(65, 100);
  movePointer(32, 100, 2);
  expect(button('gameRoom.expandPanel')).toBeDisabled();
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  movePointer(32, 100);
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  expect(dragLayout(button('gameRoom.collapsePanel'))).toHaveAttribute('data-sidebar-drop-available', 'false');
  expect(screen.getByText('pages.gameRoom.evidence.board.dragAndDrop')).toBeVisible();
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'false');
  expect(button('gameRoom.collapsePanel')).toBeDisabled();
  movePointer(400, 100);
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  dropOn(evidenceDrag, 'procedural-tray');
  expect(handlers.addEvidenceToTray).toHaveBeenCalledWith(evidence.id);
  expect(button('gameRoom.collapsePanel')).toBeEnabled();
  expect(dragLayout(button('gameRoom.collapsePanel'))).toHaveAttribute('data-sidebar-drop-available', 'false');
  fireEvent.click(requestDisclosure());

  fireEvent.click(button('pages.gameRoom.layout.tabs.personsOfInterest'));
  const characterCard = screen.getByRole('heading', { name: character.name });
  const startCharacterDrag = () => startDrag(characterCard, 'character-9', {
    type: 'CHARACTER', characterId: character.id,
  });

  fireEvent.click(button('gameRoom.activeAgents'));
  vi.spyOn(screen.getByRole('complementary'), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 280, 900));
  dropOn(startCharacterDrag(), 'guilty-zone');
  dropOn(startCharacterDrag(), 'unassigned-zone');
  expect(trayButton()).toHaveAttribute('aria-pressed', 'false');

  const characterDrag = startCharacterDrag();
  expect(dragLayout(button('gameRoom.collapsePanel'))).toHaveAttribute('data-sidebar-drop-available', 'false');
  movePointer(32, 100);
  expect(trayButton()).toHaveAttribute('aria-pressed', 'true');
  expect(requestDisclosure()).toHaveAttribute('aria-expanded', 'true');
  dropOn(characterDrag, 'procedural-tray');
  expect(handlers.addCharacterToTray).toHaveBeenCalledWith(character.id);
  expect(handlers.handleCharacterDrop).toHaveBeenNthCalledWith(1, character.id, 'guilty');
  expect(handlers.handleCharacterDrop).toHaveBeenNthCalledWith(2, character.id, 'unassigned');

  const canceledDrag = startCharacterDrag();
  expect(button('gameRoom.collapsePanel')).toBeDisabled();
  act(() => dnd.onDragCancel?.(canceledDrag));
  expect(button('gameRoom.collapsePanel')).toBeEnabled();
  expect(dragLayout(button('gameRoom.collapsePanel'))).toHaveAttribute('data-sidebar-drop-available', 'false');
  expect(handlers.addCharacterToTray).toHaveBeenCalledOnce();
  expect(handlers.handleCharacterDrop).toHaveBeenCalledTimes(2);
});

it('reveals the collapsed top sidebar only for the touch that is dragging', () => {
  renderLayout();
  fireEvent.click(button('pages.gameRoom.layout.tabs.personsOfInterest'));
  fireEvent.click(button('gameRoom.collapsePanel'));
  vi.spyOn(collapsedDragEdge(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 56));

  const source = screen.getByRole('heading', { name: character.name });
  const start = () => startDrag(source, 'character-9', { type: 'CHARACTER', characterId: character.id },
    touchEvent('touchstart', 1, 200, 200));
  const canceled = start();
  const dragLayout = button('gameRoom.expandPanel').closest('[data-sidebar-drop-available]');
  expect(dragLayout).toHaveAttribute('data-sidebar-drop-available', 'true');
  fireEvent(document, touchEvent('touchmove', 1, 200, 57));
  fireEvent(document, touchEvent('touchmove', 2, 200, 20));
  act(() => dnd.onDragCancel?.(canceled));
  expect(dragLayout).toHaveAttribute('data-sidebar-drop-available', 'false');
  fireEvent(document, touchEvent('touchmove', 1, 200, 20));
  expect(button('gameRoom.expandPanel')).toBeEnabled();
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

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
  vi.spyOn(collapsedDragEdge(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 64, 900));
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
