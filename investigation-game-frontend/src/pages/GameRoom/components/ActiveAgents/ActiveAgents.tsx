import { useTranslation } from 'react-i18next';
import type { RoomUser } from '@/types';
import styles from './ActiveAgents.module.css';

interface ActiveAgentsProps {
  users?: RoomUser[];
  hostUserId: number;
}

export default function ActiveAgents({ users, hostUserId }: ActiveAgentsProps) {
  const { t } = useTranslation();

  return (
    <ul className={styles.agentList}>
      {users ? (
        users.map((participant) => (
          <li key={participant.id} className={styles.agentItem}>
            <span className={`${styles.agentRole} ${participant.role === 'host' ? styles.hostRole : styles.participantRole}`}></span>
            {participant.user?.username || `Agent #${participant.user_id}`}
          </li>
        ))
      ) : (
        <li className={styles.agentItem}>
          <span className={`${styles.agentRole} ${styles.hostRole}`}></span>
          {t('pages.gameRoom.layout.host')} (ID: {hostUserId})
        </li>
      )}
    </ul>
  );
}