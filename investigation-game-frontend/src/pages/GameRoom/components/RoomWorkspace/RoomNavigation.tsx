import { useTranslation } from 'react-i18next';
import { useRoomTabIndicator } from './useRoomTabIndicator';
import styles from '../../GameRoomLayout.module.css';

export type WorkspaceTab = 'details' | 'evidences' | 'campaign' | 'characters';

export interface RoomNavigationProps {
  activeTab: WorkspaceTab;
  hasUnreadEvidence: boolean;
  hasUnreadCharacters: boolean;
  onSelectTab: (tab: WorkspaceTab) => void;
}

export default function RoomNavigation({ activeTab, hasUnreadEvidence, hasUnreadCharacters, onSelectTab }: RoomNavigationProps) {
  const { t } = useTranslation();
  const rowRef = useRoomTabIndicator(activeTab);
  const tabs: { id: WorkspaceTab; label: string; hasUnread?: boolean }[] = [
    { id: 'details', label: t('pages.gameRoom.layout.tabs.caseDetails') },
    { id: 'evidences', label: t('pages.gameRoom.layout.tabs.evidences'), hasUnread: hasUnreadEvidence },
    { id: 'characters', label: t('pages.gameRoom.layout.tabs.personsOfInterest', 'Persons of Interest'), hasUnread: hasUnreadCharacters },
    { id: 'campaign', label: t('pages.gameRoom.layout.tabs.campaign') },
  ];

  return (
    <header className={styles.workspaceHeader}>
      <nav className={styles.navbar}>
        <div className={styles.navLinks} ref={rowRef}>
          <span className={styles.tabHighlight} aria-hidden="true" />
          {tabs.map(({ id, label, hasUnread }) => (
            <button
              key={id}
              type="button"
              data-room-tab={id}
              className={`${styles.tabBtn} ${activeTab === id ? styles.activeTab : ''}`}
              onClick={() => onSelectTab(id)}
            >
              <span className={styles.tabLabel}>{label}</span>
              <span className={styles.tabInk} aria-hidden="true">{label}</span>
              {hasUnread && <span className={styles.unreadIndicator} title={t('pages.gameRoom.layout.tabs.unreadIntel')} />}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
