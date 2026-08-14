// FILE: src/pages/GameRoom/GameRoomLayout.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRoomState, useRoomActions } from '@/context/RoomContext';
import type { ToastNotification } from '@/context/RoomContext';
import CaseDetailsTab from './tabs/CaseDetails/CaseDetailsTab';
import EvidenceBoardTab from './tabs/EvidenceBoard/EvidenceBoardTab';
import SuspectsTab from './tabs/Suspects/SuspectsTab';
import CampaignTab from './tabs/Campaign/CampaignTab';
import AgentNotepad from '@/components/AgentNotepad/AgentNotepad';
import GameEndOverlay from './components/GameEndOverlay';

type Tab = 'details' | 'evidences' | 'campaign' | 'suspects';

interface GameRoomLayoutProps {
  resolutionMessage: string | null;
  finalStats: any;
  toasts: ToastNotification[];
}

export default function GameRoomLayout({ resolutionMessage, finalStats, toasts }: GameRoomLayoutProps) {
  const { 
    room, 
    accumulatedEvidences, 
    accumulatedSuspects, 
    accumulatedVictims, 
    viewedEvidences, 
    viewedSuspects, 
    viewedVictims, 
    globalFeedback 
  } = useRoomState();
  const { setGlobalFeedback } = useRoomActions();
  
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!room?.invite_code) return;
    try {
      await navigator.clipboard.writeText(room.invite_code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const hasUnreadEvidence = accumulatedEvidences.some(evidence => !viewedEvidences.has(evidence.id));
  const hasUnreadSuspects = accumulatedSuspects.some(suspect => !viewedSuspects.has(suspect.id));
  const hasUnreadVictims = accumulatedVictims?.some(victim => !viewedVictims.has(victim.id));

  return (
    <div className="game-room-layout">
      
      {/* 1. THE NEW GLOBAL MODAL */}
      {globalFeedback && (
        <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
          <div className={`feedback-modal-content ${globalFeedback.type}`}>
            {globalFeedback.type === 'error' && (
              <div className="persona-container">
                <svg className="persona-silhouette" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M100 50 C100 20, 156 20, 156 50 L160 80 L96 80 Z" />
                  <ellipse cx="128" cy="85" rx="70" ry="12" />
                  <path d="M105 100 L151 100 C151 125, 138 145, 128 145 C118 145, 105 125, 105 100 Z" />
                  <path d="M128 135 C80 135, 40 190, 20 256 L236 256 C216 190, 176 135, 128 135 Z" />
                </svg>
              </div>
            )}
            <h3 className="feedback-title">{globalFeedback.title}</h3>
            <p className="feedback-message">{globalFeedback.message}</p>
            <button className="btn-secondary mt-1" onClick={() => setGlobalFeedback(null)}>Acknowledge</button>
          </div>
        </div>
      )}

      {/* 2. GLOBAL TOAST RENDERER */}
      {createPortal(
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className="system-toast-notification">
              <div className="toast-icon pulse-icon">
                <img src={toast.icon} alt={toast.type} className="toast-svg-graphic" />
              </div>
              <div className="toast-text-block">
                <span className="toast-header">{toast.title}</span>
                <p className="toast-message">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}

      <GameEndOverlay status={room.status} resolutionMessage={resolutionMessage} finalStats={finalStats} />

      <aside className="sidebar-panel glass-panel">
        <div className="sidebar-section">
          <div className="sidebar-heading-wrapper">
            <h3 className="sidebar-heading">Session Code</h3>
            <button 
              className={`copy-btn ${isCopied ? 'copied' : ''}`}
              onClick={handleCopyCode}
              title="Copy Invite Code"
            >
              {isCopied ? '✓' : '⧉'}
            </button>
          </div>
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
                  flex: 1, height: '8px', borderRadius: '2px',
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
            {room.users ? room.users.map((participant: any) => (
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

        <AgentNotepad roomId={room.id} />
      </aside>

      <main className="workspace-panel">
        <header className="workspace-header">
          <nav className="tab-navigation">
            <button className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
              Case Details
              {hasUnreadVictims && <div className="unread-indicator" style={{ top: '12px', right: '-15px', width: '12px', height: '12px' }} title="New Casualty"></div>}
            </button>
            <button className={`tab-btn ${activeTab === 'evidences' ? 'active' : ''}`} onClick={() => setActiveTab('evidences')}>
              Evidences
              {hasUnreadEvidence && <div className="unread-indicator" style={{ top: '12px', right: '-15px', width: '12px', height: '12px' }} title="Unread Intel"></div>}
            </button>
            <button className={`tab-btn ${activeTab === 'suspects' ? 'active' : ''}`} onClick={() => setActiveTab('suspects')}>
              Suspects
              {hasUnreadSuspects && <div className="unread-indicator" style={{ top: '12px', right: '-15px', width: '12px', height: '12px' }} title="Unread Intel"></div>}
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
  );
}