import { useId, useRef, useState } from 'react';
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
  toasts: ToastNotification[];
}

export default function GameRoomLayout({ resolutionMessage, finalStats, toasts }: GameRoomLayoutProps) {
  const { t } = useTranslation();
  const { room, accumulatedEvidences, accumulatedCharacters, refreshRoomData } = useRoomData();
  const { viewedEvidences, viewedCharacters, globalFeedback, setGlobalFeedback, setGameOverData } = useRoomUI();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('details');
  const [campaignRoomId, setCampaignRoomId] = useState<typeof room.id | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('agents');
  const [sidebarState, setSidebarState] = useState<'initial' | 'expanded' | 'collapsed'>('initial');
  const isSidebarCollapsed = sidebarState === 'collapsed';
  const sidebarId = useId();
  const sidebarRef = useRef<HTMLElement>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const closeExitWarning = () => setShowExitWarning(false);
  const departure = useLeaveRoom(room, closeExitWarning);

  const request = useInvestigationRequest(room, refreshRoomData);
  const verdict = useSuspectVerdict(room, refreshRoomData, setGameOverData);

  useRoomPageHide(room.id);

  const selectSidebarTab = (tab: SidebarTab) => {
    setSidebarTab(tab);
    setSidebarState(state => state === 'collapsed' ? 'expanded' : state);
  };

  const selectWorkspaceTab = (tab: WorkspaceTab) => {
    if (tab === 'campaign') setCampaignRoomId(room.id);
    setActiveTab(tab);
  };

  const drag = useRoomDragAndDrop({
    accumulatedEvidences,
    accumulatedCharacters,
    sidebarRef,
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
        data-sidebar-motion={sidebarState}
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
            title={request.feedback.type === 'success'
              ? t('pages.gameRoom.evidence.board.requestApproved')
              : t('pages.gameRoom.evidence.board.requestDenied')}
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

        <RoomToasts toasts={toasts} />
        <GameEndOverlay status={room.status} resolutionMessage={resolutionMessage} finalStats={finalStats} />

        <RoomSidebar
          sidebarRef={sidebarRef}
          room={room}
          sidebarId={sidebarId}
          sidebarTab={sidebarTab}
          isSidebarCollapsed={isSidebarCollapsed}
          isDragging={drag.isDragging}
          onSelectTab={selectSidebarTab}
          onToggleCollapse={() => setSidebarState(state => state === 'collapsed' ? 'expanded' : 'collapsed')}
          onExit={() => setShowExitWarning(true)}
          requestTray={{
            accumulatedEvidences,
            accumulatedCharacters,
            trayEvidences: request.trayEvidences,
            trayCharacters: request.trayCharacters,
            requestType: request.requestType,
            setRequestType: request.setRequestType,
            removeItem: request.removeItem,
            isSubmitting: request.isSubmitting,
            submitRequest: request.submitRequest,
            filedRequests: request.filedRequests,
          }}
        />

        <RoomWorkspace
          roomId={room.id}
          campaignRoomId={campaignRoomId}
          currentStrikes={room.strikes || 0}
          maxStrikes={room.game_case?.max_strikes || 5}
          navigation={{ activeTab, hasUnreadEvidence, hasUnreadCharacters, onSelectTab: selectWorkspaceTab }}
          verdict={{
            guiltyIds: verdict.guiltyIds,
            isSubmitting: verdict.isSubmitting,
            feedback: verdict.feedback,
            submitVerdict: verdict.submitVerdict,
            clearFeedback: verdict.clearFeedback,
          }}
        />

        <RoomDragOverlay evidence={drag.activeEvidence} character={drag.activeCharacter} sourcePool={drag.activeDragSource} />
      </div>
    </DndContext>
  );
}
