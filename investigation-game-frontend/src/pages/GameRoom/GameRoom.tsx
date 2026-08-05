import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '../../hooks/useGameRoom';
import { useViewedItems } from '../../hooks/useViewedItems'; 
import { RoomProvider } from '../../context/RoomContext';
import CaseDetailsTab from './tabs/CaseDetailsTab';
import EvidenceBoardTab from './tabs/EvidenceBoardTab';
import SuspectsTab from './tabs/SuspectsTab';
import CampaignTab from './tabs/CampaignTab';
import './GameRoom.css';

type Tab = 'details' | 'evidences' | 'campaign' | 'suspects';

export default function GameRoom() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  
  const { 
    room, 
    isLoading, 
    error, 
    accumulatedEvidences,
    accumulatedSuspects, 
    accumulatedVictims,
    refreshRoomData 
  } = useGameRoom(inviteCode);

  const { viewedItems: viewedEvidences, markItemAsViewed: markEvidenceAsViewed } = useViewedItems(room?.invite_code, 'evidence');
  const { viewedItems: viewedSuspects, markItemAsViewed: markSuspectAsViewed } = useViewedItems(room?.invite_code, 'suspects');
  const { viewedItems: viewedVictims, markItemAsViewed: markVictimAsViewed } = useViewedItems(room?.invite_code, 'victims');
  
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);
  const [finalStats, setFinalStats] = useState<any>(room?.final_stats || null);

  // 1. CREATE THE UNIFIED STATE UPDATER
  const setGameOverData = (message: string, stats?: any) => {
    setResolutionMessage(message);
    if (stats) setFinalStats(stats);
  };

  // 2. UPDATE THE WEBSOCKET TO USE THE NEW FUNCTION
  useEffect(() => {
    if (!room || !window.Echo) return;
    const channel = window.Echo.private(`room.${room.id}`);
    
    channel.listen('LevelTransitioned', (e: any) => {
      if (e.message) {
        if (e.status === 'active') {
           window.alert(`🚨 DEPARTMENT UPDATE:\n\n${e.message}`);
        } else {
           // If the game is actually over, update the overlay data
           setGameOverData(e.message, e.stats);
        }
      }
      refreshRoomData();
    });

    return () => {
      channel.stopListening('LevelTransitioned');
    };
  }, [room?.id, refreshRoomData]);

  const hasUnreadEvidence = accumulatedEvidences.some(evidence => !viewedEvidences.has(evidence.id));
  const hasUnreadSuspects = accumulatedSuspects.some(suspect => !viewedSuspects.has(suspect.id));
  const hasUnreadVictims = accumulatedVictims?.some(victim => !viewedVictims.has(victim.id));

  if (isLoading) return <div className="terminal-text">Synchronizing session data...</div>;
  if (error || !room) return <div className="terminal-text error">{error || 'Session not found.'}</div>;

  return (
    <RoomProvider 
      room={room} 
      accumulatedEvidences={accumulatedEvidences}
      accumulatedSuspects={accumulatedSuspects} 
      accumulatedVictims={accumulatedVictims}
      refreshRoomData={refreshRoomData}
      viewedEvidences={viewedEvidences}
      markEvidenceAsViewed={markEvidenceAsViewed}
      viewedSuspects={viewedSuspects}
      markSuspectAsViewed={markSuspectAsViewed}
      viewedVictims={viewedVictims}
      markVictimAsViewed={markVictimAsViewed}
      setGameOverData={setGameOverData} 
    >
      <div className="game-room-layout">
        
        {(room.status === 'solved' || room.status === 'failed') && (
          <div className="victory-overlay">
            <div className="victory-content" style={{ maxWidth: '800px', padding: '2rem' }}>
              
              {room.status === 'solved' ? (
                <>
                  <div className="forensic-icon pulse" style={{ color: 'var(--accent-cyan)' }}>✧</div>
                  <h1 className="victory-title" style={{ color: 'var(--accent-cyan)' }}>CASE CLOSED</h1>
                  <p className="victory-subtitle">{resolutionMessage || 'The truth is uncovered. Excellent work.'}</p>
                </>
              ) : (
                <>
                  <div className="forensic-icon pulse" style={{ color: 'var(--accent-crimson)' }}>✕</div>
                  <h1 className="victory-title" style={{ color: 'var(--accent-crimson)', textShadow: '0 0 30px rgba(163,50,50,0.4)' }}>
                    MANDATE REVOKED
                  </h1>
                  <p className="victory-subtitle" style={{ color: 'var(--accent-crimson)' }}>
                    {resolutionMessage || 'The evidence was misread. The guilty walk free, and the innocent pay the price.'}
                  </p>
                </>
              )}

              {finalStats && (
                <div className="victory-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Time Elapsed</span>
                    <span className="stat-value">{finalStats.time_taken}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">XP Granted</span>
                    <span className="stat-value highlight">{finalStats.xp_gained} <span className="stat-sub">/ {finalStats.max_xp}</span></span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Suspects Caught</span>
                    <span className="stat-value">{finalStats.suspects_caught} <span className="stat-sub">/ {finalStats.total_guilty}</span></span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Innocents Accused</span>
                    <span className={`stat-value ${finalStats.innocents_accused > 0 ? 'error' : 'success'}`}>
                      {finalStats.innocents_accused}
                    </span>
                  </div>
                </div>
              )}

              <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem', width: '100%' }}>
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
            <h3 className="sidebar-heading" style={{ color: 'var(--accent-crimson)', borderColor: 'rgba(255,51,102,0.2)' }}>
              Department Heat
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {[...Array(room.game_case?.max_strikes || 5)].map((_, i) => (
                <div 
                  key={i} 
                  style={{
                    flex: 1,
                    height: '8px',
                    borderRadius: '2px',
                    background: i < (room.strikes || 0) ? 'var(--accent-crimson)' : 'rgba(255,255,255,0.05)',
                    boxShadow: i < (room.strikes || 0) ? '0 0 10px rgba(163,50,50,0.8)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                ></div>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', textAlign: 'right' }}>
              STRIKES: {room.strikes || 0} / {room.game_case?.max_strikes || 5}
            </div>
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
              <button className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
                Case Details
                {hasUnreadVictims && (
                  <div className="unread-indicator" style={{ top: '12px', right: '-15px', width: '12px', height: '12px' }} title="New Casualty"></div>
                )}
              </button>
              
              <button className={`tab-btn ${activeTab === 'evidences' ? 'active' : ''}`} onClick={() => setActiveTab('evidences')}>
                Evidences
                {hasUnreadEvidence && (
                  <div className="unread-indicator" style={{ top: '12px', right: '-15px', width: '12px', height: '12px' }} title="Unread Intel"></div>
                )}
              </button>
              
              <button className={`tab-btn ${activeTab === 'suspects' ? 'active' : ''}`} onClick={() => setActiveTab('suspects')}>
                Suspects
                {hasUnreadSuspects && (
                  <div className="unread-indicator" style={{ top: '12px', right: '-15px', width: '12px', height: '12px' }} title="Unread Intel"></div>
                )}
              </button>
              
              <button className={`tab-btn ${activeTab === 'campaign' ? 'active' : ''}`} onClick={() => setActiveTab('campaign')}>Campaign</button>
            </nav>
          </header>

          <div className="tab-content-area">
            {activeTab === 'details' && <CaseDetailsTab />}
            {activeTab === 'evidences' && <EvidenceBoardTab />}
            {activeTab === 'suspects' && <SuspectsTab />}
            {activeTab === 'campaign' && <CampaignTab />}
          </div>
        </main>
      </div>
    </RoomProvider>
  );
}