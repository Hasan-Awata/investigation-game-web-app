import type { ComponentProps, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '@/components/LanguageToggle';
import type { GameRoom } from '@/types';
import { getLocalUser } from '@/utils/userState';
import ActiveAgents from '../ActiveAgents/ActiveAgents';
import AgentNotepad from '../AgentNotepad/AgentNotepad';
import ProceduralRequestTray from '../ProceduralRequestTray/ProceduralRequestTray';
import SessionCode from './SessionCode';
import { FileEditIcon } from './icons/file-edit';
import LeaveSessionIcon from './icons/LeaveSessionIcon';
import ProceduralScalesIcon from './icons/ProceduralScalesIcon';
import { Settings01Icon } from './icons/settings-01';
import { UserGroupIcon } from './icons/user-group';
import styles from '../../GameRoomLayout.module.css';

export type SidebarTab = 'ledger' | 'agents' | 'procedural' | 'settings';

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
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarToggleHeader}>
          <button
            type="button"
            className={`${styles.toggleIconBtn} ${sidebarTab === 'agents' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('agents')} title={t('gameRoom.activeAgents')}
            aria-label={t('gameRoom.activeAgents')} aria-pressed={sidebarTab === 'agents'}
          >
            <UserGroupIcon className={styles.sidebarAnimatedIcon} size={18} />
          </button>
          <button
            type="button"
            className={`${styles.toggleIconBtn} ${sidebarTab === 'ledger' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('ledger')} title={t('components.agentNotepad.fieldLedger', 'Field Ledger')}
            aria-label={t('components.agentNotepad.fieldLedger', 'Field Ledger')} aria-pressed={sidebarTab === 'ledger'}
          >
            <FileEditIcon className={styles.sidebarAnimatedIcon} size={18} />
          </button>
          <button
            type="button"
            className={`${styles.toggleIconBtn} ${sidebarTab === 'procedural' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('procedural')} title={t('pages.gameRoom.evidence.board.proceduralTrayTitle', 'Procedural Requests')}
            aria-label={t('pages.gameRoom.evidence.board.proceduralTrayTitle', 'Procedural Requests')} aria-pressed={sidebarTab === 'procedural'}
          >
            <ProceduralScalesIcon className={styles.sidebarAnimatedIcon} />
          </button>
          <button
            type="button"
            className={`${styles.toggleIconBtn} ${sidebarTab === 'settings' ? styles.activeToggle : ''}`}
            onClick={() => onSelectTab('settings')} title={t('gameRoom.settings.title')}
            aria-label={t('gameRoom.settings.title')} aria-pressed={sidebarTab === 'settings'}
          >
            <Settings01Icon className={styles.sidebarAnimatedIcon} size={18} />
          </button>
          <button
            type="button"
            className={`${styles.toggleIconBtn} ${styles.leaveBtn}`}
            onClick={event => {
              event.currentTarget.focus();
              onExit();
            }}
            title={t('pages.gameRoom.layout.tabs.returnToMenu', 'Leave session')}
            aria-label={t('pages.gameRoom.layout.tabs.returnToMenu', 'Leave session')}
            aria-haspopup="dialog"
          >
            <LeaveSessionIcon className={styles.sidebarAnimatedIcon} />
          </button>
        </div>

        <div className={styles.sidebarToggleContent}>
          {sidebarTab === 'agents' ? (
            <>
              <SessionCode key={room.invite_code} inviteCode={room.invite_code} />
              <div className={styles.sidebarAgentsList}>
                <ActiveAgents key={room.id} users={room.users} hostUserId={room.host_user_id}
                  canRemovePlayers={room.status === 'active' && getLocalUser()?.id === room.host_user_id} />
              </div>
            </>
          ) : sidebarTab === 'procedural' ? (
            <ProceduralRequestTray {...requestTray} />
          ) : sidebarTab === 'settings' ? (
            <div className={styles.settingsRow}>
              <span>{t('gameRoom.settings.language')}</span>
              <LanguageToggle />
            </div>
          ) : (
            <AgentNotepad roomId={room.id} />
          )}
        </div>
      </div>
    </aside>
  );
}
