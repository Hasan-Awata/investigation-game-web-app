import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { joinRoom, fetchRoomState } from '../../services/api';
import type { GameRoom as GameRoomType } from '../../types';
import CaseDetailsTab from './tabs/CaseDetailsTab';
import EvidenceBoardTab from './tabs/EvidenceBoardTab';
import CampaignTab from './tabs/CampaignTab';
import './GameRoom.css';

type Tab = 'details' | 'evidences' | 'campaign';

export default function GameRoom() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [room, setRoom] = useState<GameRoomType | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoom = async () => {
      if (!inviteCode) return;
      
      // 1. Join the room to ensure access and get the Room ID
      const joinResult = await joinRoom(inviteCode);
      
      if (joinResult.isSuccess) {
        // 2. Fetch the fully hydrated room state (with levels and evidence)
        const stateResult = await fetchRoomState(joinResult.value.id);
        
        if (stateResult.isSuccess) {
          setRoom(stateResult.value);
        } else {
          setError(stateResult.errorMessage);
        }
      } else {
        setError(joinResult.errorMessage);
      }
      setIsLoading(false);
    };

    loadRoom();
  }, [inviteCode]);

  if (isLoading) return <div className="terminal-text">Synchronizing session data...</div>;
  if (error || !room) return <div className="terminal-text error">{error || 'Session not found.'}</div>;

// 1. Determine the order index of the current active level
  const currentLevelIndex = room.game_case?.levels?.find(
    (l) => l.id === room.current_level_id
  )?.order_index || 0;

  // 2. Filter out future locked levels, then map and flatten the evidence into a single array
  const accumulatedEvidences = room.game_case?.levels
    ?.filter((level) => level.order_index <= currentLevelIndex)
    ?.flatMap((level) => level.evidences || []) || [];

  // Inside GameRoom.tsx, define a refresh function above the return statement:
    const refreshRoomData = async () => {
        if (!room) return;
        const stateResult = await fetchRoomState(room.id);
        if (stateResult.isSuccess) setRoom(stateResult.value);
    };

  return (
    <div className="game-room-layout">
      <aside className="sidebar-panel glass-panel">
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Session Code</h3>
          <div className="invite-code-display">{room.invite_code}</div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-heading">Active Agents</h3>
          <ul className="agent-list">
            {room.users ? room.users.map((participant) => (
              <li key={participant.id} className="agent-item">
                <span className={`agent-role ${participant.role}`}></span>
                {participant.user?.username || `Agent #${participant.user_id}`}
              </li>
            )) : (
              <li className="agent-item">
                <span className="agent-role host"></span>
                Host (ID: {room.host_user_id})
              </li>
            )}
          </ul>
        </div>
      </aside>

      <main className="workspace-panel">
        <header className="workspace-header">
          <nav className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Case Details
            </button>
            <button 
              className={`tab-btn ${activeTab === 'evidences' ? 'active' : ''}`}
              onClick={() => setActiveTab('evidences')}
            >
              Evidences
            </button>
            <button 
              className={`tab-btn ${activeTab === 'campaign' ? 'active' : ''}`}
              onClick={() => setActiveTab('campaign')}
            >
              Campaign
            </button>
          </nav>
        </header>

        <div className="tab-content-area">
          {activeTab === 'details' && (
            <CaseDetailsTab gameCase={room.game_case || {
              id: room.case_id,
              title: "Case Data Missing",
              story: "The case metadata was not eager-loaded by the server.",
              min_player_XP: 0,
              XP_on_solve: 0
            }} />
          )}
          {/* Inject the real DB evidence directly into the tab */}
          {activeTab === 'evidences' && (
            <EvidenceBoardTab evidences={accumulatedEvidences} />
          )}
          {activeTab === 'campaign' && (
            <CampaignTab 
              levels={room.game_case?.levels || []} 
              currentLevelId={room.current_level_id} 
              roomId={room.id}
              roomStatus={room.status} // <-- Add this line
              onLevelCleared={refreshRoomData} 
            />
          )}
        </div>
      </main>
    </div>
  );
}