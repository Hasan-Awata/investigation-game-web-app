import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useGameRoom } from '../../hooks/useGameRoom';
import { RoomProvider } from '../../context/RoomContext';
import CaseDetailsTab from './tabs/CaseDetailsTab';
import EvidenceBoardTab from './tabs/EvidenceBoardTab';
import CampaignTab from './tabs/CampaignTab';
import './GameRoom.css';

type Tab = 'details' | 'evidences' | 'campaign';

export default function GameRoom() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate(); // Initialize navigation
  
  const { 
    room, 
    isLoading, 
    error, 
    accumulatedEvidences, 
    refreshRoomData 
  } = useGameRoom(inviteCode);
  
  const [activeTab, setActiveTab] = useState<Tab>('details');

  if (isLoading) return <div className="terminal-text">Synchronizing session data...</div>;
  if (error || !room) return <div className="terminal-text error">{error || 'Session not found.'}</div>;

  return (
    <RoomProvider 
      room={room} 
      accumulatedEvidences={accumulatedEvidences} 
      refreshRoomData={refreshRoomData}
    >
      <div className="game-room-layout">
        
        {/* The Victory Overlay */}
        {room.status === 'solved' && (
          <div className="victory-overlay">
            <div className="victory-content">
              <div className="forensic-icon pulse">✧</div>
              <h1 className="victory-title">CASE CLOSED</h1>
              <p className="victory-subtitle">The choices were made. The truth is uncovered. Excellent work.</p>
              <button className="btn-primary" onClick={() => navigate('/')}>
                Return to Headquarters
              </button>
            </div>
          </div>
        )}

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
            {activeTab === 'details' && <CaseDetailsTab />}
            {activeTab === 'evidences' && <EvidenceBoardTab />}
            {activeTab === 'campaign' && <CampaignTab />}
          </div>
        </main>
      </div>
    </RoomProvider>
  );
}