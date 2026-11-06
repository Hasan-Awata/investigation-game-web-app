import type { ComponentProps, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameRoom } from '@/types';
import ActiveAgents from '../ActiveAgents/ActiveAgents';
import AgentNotepad from '../AgentNotepad/AgentNotepad';
import GameRoomSettings from '../GameRoomSettings/GameRoomSettings';
import ProceduralRequestTray from '../ProceduralRequestTray/ProceduralRequestTray';
import RoomSessionControls from './RoomSessionControls';
import styles from '../../GameRoomLayout.module.css';

export type SidebarTab = 'ledger' | 'agents' | 'procedural' | 'settings';

interface RoomSidebarProps {
  sidebarRef: Ref<HTMLElement>;
  room: GameRoom;
  sidebarId: string;
  sidebarTab: SidebarTab;
  isSidebarCollapsed: boolean;
  isDragging: boolean;
  requestTray: ComponentProps<typeof ProceduralRequestTray>;
  onSelectTab: (tab: SidebarTab) => void;
  onToggleCollapse: () => void;
  onExit: () => void;
}

export default function RoomSidebar({
  sidebarRef, room, sidebarId, sidebarTab, isSidebarCollapsed, isDragging, requestTray, onSelectTab, onToggleCollapse, onExit,
}: RoomSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside ref={sidebarRef} className={styles.sidebarPanel}>
      <RoomSessionControls
        inviteCode={room.invite_code}
        sidebarId={sidebarId}
        isSidebarCollapsed={isSidebarCollapsed}
        onExit={onExit}
      />

      <div className={`${styles.sidebarSection} ${styles.sidebarFlexSection}`}>
        <div className={styles.sidebarToggleHeader}>
          <button
            className={`${styles.toggleIconBtn} ${sidebarTab === 'agents' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('agents')} title={t('gameRoom.activeAgents')}
            aria-label={t('gameRoom.activeAgents')} aria-pressed={sidebarTab === 'agents'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18" /><path d="M6 12l1.5-6h9l1.5 6" /><path d="M12 12v3" /><circle cx="8.5" cy="16.5" r="2.5" /><circle cx="15.5" cy="16.5" r="2.5" /><path d="M11 16.5h2" /></svg>
          </button>
          <button
            className={`${styles.toggleIconBtn} ${sidebarTab === 'ledger' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('ledger')} title={t('components.agentNotepad.fieldLedger', 'Field Ledger')}
            aria-label={t('components.agentNotepad.fieldLedger', 'Field Ledger')} aria-pressed={sidebarTab === 'ledger'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
          </button>
          <button
            className={`${styles.toggleIconBtn} ${sidebarTab === 'procedural' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('procedural')} title={t('pages.gameRoom.evidence.board.proceduralTrayTitle', 'Procedural Requests')}
            aria-label={t('pages.gameRoom.evidence.board.proceduralTrayTitle', 'Procedural Requests')} aria-pressed={sidebarTab === 'procedural'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/>
              <path d="M12 3v18"/>
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.toggleIconBtn} ${sidebarTab === 'settings' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('settings')} title={t('gameRoom.settings.title')}
            aria-label={t('gameRoom.settings.title')} aria-pressed={sidebarTab === 'settings'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9.5 3-.6 2.4-2 .9L4.6 5.6 2 10l1.8 1.7v.6L2 14l2.6 4.4 2.3-.7 2 .9.6 2.4h5l.6-2.4 2-.9 2.3.7L22 14l-1.8-1.7v-.6L22 10l-2.6-4.4-2.3.7-2-.9-.6-2.4Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.toggleIconBtn} ${styles.collapseBtn}`}
            onClick={onToggleCollapse}
            disabled={isDragging}
            aria-expanded={!isSidebarCollapsed}
            aria-controls={`${sidebarId}-session ${sidebarId}-content`}
            aria-label={t(isSidebarCollapsed ? 'gameRoom.expandPanel' : 'gameRoom.collapsePanel')}
            title={t(isSidebarCollapsed ? 'gameRoom.expandPanel' : 'gameRoom.collapsePanel')}
          >
            <svg className={styles.collapseIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
              <path d={isSidebarCollapsed ? 'm12 9 3 3-3 3' : 'm15 9-3 3 3 3'} />
            </svg>
          </button>
        </div>

        <div id={`${sidebarId}-content`} className={styles.sidebarToggleContent} hidden={isSidebarCollapsed}>
          {sidebarTab === 'agents' ? (
            <ActiveAgents users={room.users} hostUserId={room.host_user_id} />
          ) : sidebarTab === 'procedural' ? (
            <ProceduralRequestTray {...requestTray} />
          ) : sidebarTab === 'settings' ? (
            <GameRoomSettings />
          ) : (
            <AgentNotepad roomId={room.id} />
          )}
        </div>
      </div>
    </aside>
  );
}
