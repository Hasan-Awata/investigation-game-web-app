import { Activity } from 'react';
import type { ComponentProps } from 'react';
import type { GameRoom } from '@/types';
import CaseDetailsTab from '../../tabs/CaseDetails/CaseDetailsTab';
import EvidenceBoardTab from '../../tabs/EvidenceBoard/EvidenceBoardTab';
import PersonsOfInterestTab from '../../tabs/Characters/CharactersTab';
import CampaignTab from '../../tabs/Campaign/CampaignTab';
import RoomNavigation from './RoomNavigation';
import type { RoomNavigationProps } from './RoomNavigation';
import styles from '../../GameRoomLayout.module.css';

interface RoomWorkspaceProps {
  onOpenRequiredRequest: (requestId: number) => void;
  roomId: GameRoom['id'];
  campaignRoomId: GameRoom['id'] | null;
  evidenceRoomId: GameRoom['id'] | null;
  managementTrust: GameRoom['management_trust'];
  navigation: RoomNavigationProps;
  verdict: ComponentProps<typeof PersonsOfInterestTab>;
}

export default function RoomWorkspace({ roomId, campaignRoomId, evidenceRoomId, managementTrust, navigation, verdict, onOpenRequiredRequest }: RoomWorkspaceProps) {
  const { activeTab } = navigation;

  return (
    <main className={styles.workspacePanel}>
      <RoomNavigation {...navigation} managementTrust={managementTrust} />

      <div className={styles.tabContentArea}>
        {activeTab === 'details' && <CaseDetailsTab />}
        {(activeTab === 'evidences' || evidenceRoomId === roomId) && (
          <Activity key={`evidences:${roomId}`} mode={activeTab === 'evidences' ? 'visible' : 'hidden'}>
            <EvidenceBoardTab />
          </Activity>
        )}
        {activeTab === 'characters' && (
          <PersonsOfInterestTab {...verdict} />
        )}
        {(activeTab === 'campaign' || campaignRoomId === roomId) && (
          <Activity key={`campaign:${roomId}`} mode={activeTab === 'campaign' ? 'visible' : 'hidden'}>
            <CampaignTab onOpenRequiredRequest={onOpenRequiredRequest} />
          </Activity>
        )}
      </div>
    </main>
  );
}
