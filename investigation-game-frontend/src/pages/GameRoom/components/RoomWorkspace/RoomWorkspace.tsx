import { Activity } from 'react';
import type { ComponentProps } from 'react';
import type { GameRoom } from '@/types';
import CaseDetailsTab from '../../tabs/CaseDetails/CaseDetailsTab';
import EvidenceBoardTab from '../../tabs/EvidenceBoard/EvidenceBoardTab';
import PersonsOfInterestTab from '../../tabs/Characters/CharactersTab';
import CampaignTab from '../../tabs/Campaign/CampaignTab';
import RoomNavigation from './RoomNavigation';
import type { RoomNavigationProps } from './RoomNavigation';
import RoomStrikeIndicator from './RoomStrikeIndicator';
import styles from '../../GameRoomLayout.module.css';

interface RoomWorkspaceProps {
  roomId: GameRoom['id'];
  campaignRoomId: GameRoom['id'] | null;
  currentStrikes: number;
  maxStrikes: number;
  navigation: RoomNavigationProps;
  verdict: ComponentProps<typeof PersonsOfInterestTab>;
}

export default function RoomWorkspace({ roomId, campaignRoomId, currentStrikes, maxStrikes, navigation, verdict }: RoomWorkspaceProps) {
  const { activeTab } = navigation;

  return (
    <main className={styles.workspacePanel}>
      <RoomStrikeIndicator currentStrikes={currentStrikes} maxStrikes={maxStrikes} />
      <RoomNavigation {...navigation} />

      <div className={styles.tabContentArea}>
        {activeTab === 'details' && <CaseDetailsTab />}
        {activeTab === 'evidences' && <EvidenceBoardTab />}
        {activeTab === 'characters' && (
          <PersonsOfInterestTab {...verdict} />
        )}
        {(activeTab === 'campaign' || campaignRoomId === roomId) && (
          <Activity key={roomId} mode={activeTab === 'campaign' ? 'visible' : 'hidden'}>
            <CampaignTab />
          </Activity>
        )}
      </div>
    </main>
  );
}
