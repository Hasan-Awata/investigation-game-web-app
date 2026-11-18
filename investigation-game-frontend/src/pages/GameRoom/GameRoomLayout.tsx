import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext } from '@dnd-kit/core';
import { useRoomData, useRoomUI } from '@/context/RoomContext.shared';
import type { ToastNotification } from '@/context/RoomContext.shared';
import { useInvestigationRequest } from '@/hooks/useInvestigationRequest';
import { useLeaveRoom } from '@/hooks/useLeaveRoom';
import { useRoomPageHide } from '@/hooks/useRoomPageHide';
import { useSuspectVerdict } from '@/hooks/useSuspectVerdict';
import type { FinalStats } from '@/types';
import GameEndOverlay from './components/GameEffects/GameEndOverlay';
import RoomExitDialog from './components/RoomDialogs/RoomExitDialog';
import RoomFeedbackDialog from './components/RoomDialogs/RoomFeedbackDialog';
import RoomDragOverlay from './components/RoomDragOverlay/RoomDragOverlay';
import RoomSidebar from './components/RoomSidebar/RoomSidebar';
import type { SidebarTab } from './components/RoomSidebar/RoomSidebar';
import RoomToasts from './components/RoomToasts/RoomToasts';
import type { WorkspaceTab } from './components/RoomWorkspace/RoomNavigation';
import RoomWorkspace from './components/RoomWorkspace/RoomWorkspace';
import { useRoomDragAndDrop } from './hooks/useRoomDragAndDrop';
import styles from './GameRoomLayout.module.css';

interface GameRoomLayoutProps {
  resolutionMessage: string | null;
  finalStats: FinalStats | null;
  toasts: (ToastNotification & { visible?: boolean })[];
  onDismissToast?: (id: string) => void;
  onToastPauseChange?: (paused: boolean) => void;
}

export default function GameRoomLayout({ resolutionMessage, finalStats, toasts, onDismissToast, onToastPauseChange }: GameRoomLayoutProps) {
  const { t } = useTranslation();
  const { room, accumulatedEvidences, accumulatedCharacters, refreshRoomData } = useRoomData();
  const { viewedEvidences, viewedCharacters, globalFeedback, setGlobalFeedback, setGameOverData } = useRoomUI();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('details');
  const [campaignRoomId, setCampaignRoomId] = useState<typeof room.id | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('agents');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requestDisclosure, setRequestDisclosure] = useState({ roomId: room.id, expanded: false });
  if (requestDisclosure.roomId !== room.id) {
    setRequestDisclosure({ roomId: room.id, expanded: false });
  }
  const setRequestListExpanded = (expanded: boolean) => setRequestDisclosure({ roomId: room.id, expanded });
  const sidebarId = useId();
  const sidebarFrameRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const collapsedDragEdgeRef = useRef<HTMLDivElement>(null);
  const sidebarHandleLabel = t(isSidebarCollapsed ? 'gameRoom.expandPanel' : 'gameRoom.collapsePanel');
  const [showExitWarning, setShowExitWarning] = useState(false);
  const closeExitWarning = () => setShowExitWarning(false);
  const departure = useLeaveRoom(room, closeExitWarning);

  const request = useInvestigationRequest(room, refreshRoomData);
  const verdict = useSuspectVerdict(room, refreshRoomData, setGameOverData);

  useLayoutEffect(() => {
    const frame = sidebarFrameRef.current;
    const panel = sidebarRef.current;
    if (!frame || !panel) return;
    const updateHeight = () => frame.style.setProperty('--sidebar-panel-height', `${panel.getBoundingClientRect().height}px`);
    updateHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(panel, { box: 'border-box' });
    return () => observer.disconnect();
  }, []);

  useRoomPageHide(room.id);

  const selectSidebarTab = (tab: SidebarTab) => {
    setSidebarTab(tab);
    setSidebarCollapsed(false);
  };

  const selectWorkspaceTab = (tab: WorkspaceTab) => {
    if (tab === 'campaign') setCampaignRoomId(room.id);
    setActiveTab(tab);
  };

  const drag = useRoomDragAndDrop({
    accumulatedEvidences,
    accumulatedCharacters,
    sidebarRef: isSidebarCollapsed ? collapsedDragEdgeRef : sidebarRef,
    isTrayVisible: !isSidebarCollapsed && sidebarTab === 'procedural',
    showProceduralTray: () => selectSidebarTab('procedural'),
    addEvidenceToTray: request.addEvidenceToTray,
    addCharacterToTray: request.addCharacterToTray,
    handleCharacterDrop: verdict.handleCharacterDrop,
  });

  const hasUnreadEvidence = accumulatedEvidences.some(ev => !viewedEvidences.has(ev.id));
  const hasUnreadCharacters = accumulatedCharacters.some(character => !viewedCharacters.has(character.id));

  return (
    <DndContext {...drag.contextProps}>
      <div
        className={`${styles.layoutContainer} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}
        data-sidebar-dragging={drag.isDragging}
        data-sidebar-drop-available={isSidebarCollapsed && Boolean(drag.activeEvidence || drag.activeCharacter)
          && room.status === 'active' && !request.isSubmitting}
        onPointerDownCapture={drag.trackPendingPointer}
      >
        {globalFeedback && (
          <RoomFeedbackDialog
            {...globalFeedback}
            acknowledgeLabel={t('pages.gameRoom.layout.acknowledge')}
            onAcknowledge={() => setGlobalFeedback(null)}
          />
        )}

        {request.feedback && (
          <RoomFeedbackDialog
            type={request.feedback.type}
            title={t('pages.gameRoom.evidence.board.requestDenied')}
            message={request.feedback.message}
            acknowledgeLabel={t('pages.gameRoom.evidence.board.acknowledge')}
            onAcknowledge={request.clearFeedback}
          />
        )}

        {showExitWarning && (
          <RoomExitDialog
            isLeaving={departure.isPending}
            onCancel={closeExitWarning}
            onLeave={() => departure.mutate()}
          />
        )}

        <RoomToasts toasts={toasts} onDismiss={onDismissToast} onPauseChange={onToastPauseChange} />
        <GameEndOverlay status={room.status} resolutionMessage={resolutionMessage} finalStats={finalStats} />

        <div ref={sidebarFrameRef} className={styles.sidebarFrame}>
          <button
            type="button"
            className={styles.sidebarHandle}
            onClick={() => setSidebarCollapsed(collapsed => !collapsed)}
            disabled={drag.isDragging}
            aria-expanded={!isSidebarCollapsed}
            aria-controls={sidebarId}
            aria-label={sidebarHandleLabel}
            title={sidebarHandleLabel}
          >
            <span className={styles.sidebarGrip} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          {isSidebarCollapsed && <div ref={collapsedDragEdgeRef} className={styles.sidebarDragEdge} aria-hidden="true" />}
          <div className={styles.sidebarClip}>
            <RoomSidebar
              sidebarRef={sidebarRef}
              room={room}
              sidebarId={sidebarId}
              sidebarTab={sidebarTab}
              isSidebarCollapsed={isSidebarCollapsed}
              onSelectTab={selectSidebarTab}
              onExit={() => setShowExitWarning(true)}
              requestTray={{
                accumulatedEvidences,
                accumulatedCharacters,
                trayEvidences: request.trayEvidences,
                trayCharacters: request.trayCharacters,
                selectedRequestId: request.selectedRequestId,
                selectRequest: request.selectRequest,
                proceduralRequests: request.proceduralRequests,
                completedRequestIds: request.completedRequestIds,
                isRequestListExpanded: requestDisclosure.expanded,
                onRequestListExpandedChange: expanded => {
                  if (!expanded) request.clearSelection();
                  setRequestListExpanded(expanded);
                },
                isRoomActive: room.status === 'active',
                removeItem: request.removeItem,
                isSubmitting: request.isSubmitting,
                submitRequest: request.submitRequest,
              }}
            />
          </div>
        </div>

        <RoomWorkspace
          onOpenRequiredRequest={requestId => {
            setSidebarCollapsed(false);
            setSidebarTab('procedural');
            setRequestListExpanded(true);
            request.selectRequest(requestId);
          }}
          roomId={room.id}
          campaignRoomId={campaignRoomId}
          currentStrikes={room.strikes || 0}
          maxStrikes={room.game_case?.max_strikes || 5}
          navigation={{ activeTab, hasUnreadEvidence, hasUnreadCharacters, onSelectTab: selectWorkspaceTab }}
          verdict={{
            characterOrder: verdict.characterOrder,
            isSubmitting: verdict.isSubmitting,
            feedback: verdict.feedback,
            submitVerdict: verdict.submitVerdict,
            clearFeedback: verdict.clearFeedback,
          }}
        />

        <RoomDragOverlay evidence={drag.activeEvidence} character={drag.activeCharacter} />
      </div>
    </DndContext>
  );
}
