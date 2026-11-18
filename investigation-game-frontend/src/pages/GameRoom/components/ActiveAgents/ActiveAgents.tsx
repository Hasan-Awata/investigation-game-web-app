import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomUser } from '@/types';
import RoomRemovePlayerDialog from '../RoomDialogs/RoomRemovePlayerDialog';
import { UserRemove01Icon } from '../RoomSidebar/icons/user-remove-01';
import layout from '../../GameRoomLayout.module.css';
import styles from './ActiveAgents.module.css';

interface ActiveAgentsProps {
  users?: RoomUser[];
  hostUserId: number;
  canRemovePlayers: boolean;
}

function HostCrown({ label }: { label?: string }) {
  return (
    <svg className={styles.playerIcon} role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 6 4.5 4L12 4l4.5 6L21 6l-2 12H5L3 6ZM7 21h10" />
    </svg>
  );
}

function MemberIcon() {
  return (
    <svg className={styles.playerIcon} aria-hidden="true" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export default function ActiveAgents({ users, hostUserId, canRemovePlayers }: ActiveAgentsProps) {
  const { t } = useTranslation();
  const hostLabel = t('pages.gameRoom.layout.host', 'Host');
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);

  return (
    <>
      <ul className={styles.agentList} aria-label={t('gameRoom.activeAgents')}>
        {users ? users.map((participant) => {
          const isHost = participant.user_id === hostUserId || participant.role === 'host';
          const name = participant.user?.username || `Agent #${participant.user_id}`;
          const removeLabel = t('gameRoom.removePlayer.button', { name });

          return (
            <li key={participant.id} className={styles.agentItem}>
              {isHost ? <HostCrown label={hostLabel} /> : <MemberIcon />}
              <span className={styles.playerName} dir="auto">{name}</span>
              {canRemovePlayers && !isHost && (
                <button type="button" className={`${layout.toggleIconBtn} ${styles.removePlayer}`}
                  aria-label={removeLabel} title={removeLabel} aria-haspopup="dialog"
                  onClick={event => {
                    event.currentTarget.focus();
                    setSelected({ id: participant.id, name });
                  }}>
                  <UserRemove01Icon className={layout.sidebarAnimatedIcon} size={18} />
                </button>
              )}
            </li>
          );
        }) : (
          <li className={styles.agentItem}>
            <HostCrown />
            {hostLabel} (ID: {hostUserId})
          </li>
        )}
      </ul>
      {canRemovePlayers && selected && (
        <RoomRemovePlayerDialog member={selected} onDismiss={() => setSelected(null)} />
      )}
    </>
  );
}
