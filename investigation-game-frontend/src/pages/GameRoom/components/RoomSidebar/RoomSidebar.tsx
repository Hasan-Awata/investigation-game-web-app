import type { ComponentProps, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameRoom } from '@/types';
import ActiveAgents from '../ActiveAgents/ActiveAgents';
import AgentNotepad from '../AgentNotepad/AgentNotepad';
import ProceduralRequestTray from '../ProceduralRequestTray/ProceduralRequestTray';
import RoomSessionControls from './RoomSessionControls';
import styles from '../../GameRoomLayout.module.css';

export type SidebarTab = 'ledger' | 'agents' | 'procedural';

interface RoomSidebarProps {
  sidebarRef: Ref<HTMLElement>;
  room: GameRoom;
  sidebarId: string;
  sidebarTab: SidebarTab;
  isSidebarCollapsed: boolean;
  requestTray: ComponentProps<typeof ProceduralRequestTray>;
  onSelectTab: (tab: SidebarTab) => void;
  onExit: () => void;
}

export default function RoomSidebar({
  sidebarRef, room, sidebarId, sidebarTab, isSidebarCollapsed, requestTray, onSelectTab, onExit,
}: RoomSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside ref={sidebarRef} id={sidebarId} className={styles.sidebarPanel}
      inert={isSidebarCollapsed} aria-hidden={isSidebarCollapsed || undefined}>
      <RoomSessionControls
        inviteCode={room.invite_code}
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
        </div>

        <div className={styles.sidebarToggleContent}>
          {sidebarTab === 'agents' ? (
            <ActiveAgents users={room.users} hostUserId={room.host_user_id} />
          ) : sidebarTab === 'procedural' ? (
            <ProceduralRequestTray {...requestTray} />
          ) : (
            <AgentNotepad roomId={room.id} />
          )}
        </div>
      </div>
    </aside>
  );
}
