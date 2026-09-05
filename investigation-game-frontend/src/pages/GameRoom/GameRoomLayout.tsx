import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom'; 
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext';
import type { ToastNotification } from '@/context/RoomContext';
import { leaveRoom } from '@/services/api';
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
  const navigate = useNavigate(); 
  const { t } = useTranslation();
  const { room, accumulatedEvidences, accumulatedSuspects, accumulatedVictims } = useRoomData();
  const { viewedEvidences, viewedSuspects, viewedVictims, globalFeedback, setGlobalFeedback } = useRoomUI();

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isCopied, setIsCopied] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false); 

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Required by modern browsers to trigger the warning
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

  const handleLeaveSession = async () => {
    if (!room) return;
    setIsLeaving(true);
    
    // Attempt graceful disconnect
    await leaveRoom(room.id);
    
    // Nuke specific session storage data on exit
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes(`room_${room.invite_code}`) || key.includes(`room_${room.id}`)) {
        sessionStorage.removeItem(key);
      }
    });

    // Hard redirect to the main menu
    navigate('/');
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
            <button className="btn-secondary mt-1" onClick={() => setGlobalFeedback(null)}>
              {t('pages.gameRoom.layout.acknowledge')}
            </button>
          </div>
        </div>
      )}

      {/* NEW: EXIT WARNING MODAL */}
      {showExitWarning && (
        <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="feedback-modal-content error">
            <div className="persona-container">
              <svg className="persona-silhouette" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M100 50 C100 20, 156 20, 156 50 L160 80 L96 80 Z" />
                <ellipse cx="128" cy="85" rx="70" ry="12" />
                <path d="M105 100 L151 100 C151 125, 138 145, 128 145 C118 145, 105 125, 105 100 Z" />
                <path d="M128 135 C80 135, 40 190, 20 256 L236 256 C216 190, 176 135, 128 135 Z" />
              </svg>
            </div>
            <h3 className="feedback-title">{t('pages.gameRoom.layout.exitWarningTitle', 'Abandon Investigation?')}</h3>
            <p className="feedback-message">
              {t('pages.gameRoom.layout.exitWarningDesc', 'Leaving the session will sever your secure connection. If you are the Host, the investigation will halt for all agents.')}
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowExitWarning(false)}>
                {t('pages.gameRoom.layout.stay', 'Maintain Connection')}
              </button>
              <button 
                className="btn-primary" 
                style={{ background: 'var(--accent-crimson)', borderColor: 'var(--accent-crimson)', color: 'var(--bg-dark)' }} 
                onClick={handleLeaveSession}
                disabled={isLeaving}
              >
                {isLeaving ? t('pages.gameRoom.layout.leaving', 'Severing...') : t('pages.gameRoom.layout.leave', 'Sever Connection')}
              </button>
            </div>
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
            <h3 className="sidebar-heading">{t('gameRoom.sessionCode')}</h3>
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
            {t('pages.gameRoom.layout.departmentHeat')}
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
            {t('gameRoom.strikes')}: {room.strikes || 0} / {room.game_case?.max_strikes || 5}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-heading">{t('gameRoom.activeAgents')}</h3>
          <ul className="agent-list">
            {room.users ? room.users.map((participant: any) => (
              <li key={participant.id} className="agent-item">
                <span className={`agent-role ${participant.role}`}></span>
                {participant.user?.username || `Agent #${participant.user_id}`}
              </li>
            )) : (
              <li className="agent-item">
                <span className="agent-role host"></span>
                {t('pages.gameRoom.layout.host')} (ID: {room.host_user_id})
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
              {t('pages.gameRoom.layout.tabs.caseDetails')}
              {hasUnreadVictims && <div className="unread-indicator" style={{ top: '12px', insetInlineEnd: '15px', width: '12px', height: '12px' }} title={t('pages.gameRoom.layout.tabs.newCasualty')}></div>}
            </button>
            <button className={`tab-btn ${activeTab === 'evidences' ? 'active' : ''}`} onClick={() => setActiveTab('evidences')}>
              {t('pages.gameRoom.layout.tabs.evidences')}
              {hasUnreadEvidence && <div className="unread-indicator" style={{ top: '12px', insetInlineEnd: '15px', width: '12px', height: '12px' }} title={t('pages.gameRoom.layout.tabs.unreadIntel')}></div>}
            </button>
            <button className={`tab-btn ${activeTab === 'suspects' ? 'active' : ''}`} onClick={() => setActiveTab('suspects')}>
              {t('pages.gameRoom.layout.tabs.suspects')}
              {hasUnreadSuspects && <div className="unread-indicator" style={{ top: '12px', insetInlineEnd: '15px', width: '12px', height: '12px' }} title={t('pages.gameRoom.layout.tabs.unreadIntel')}></div>}
            </button>
            <button className={`tab-btn ${activeTab === 'campaign' ? 'active' : ''}`} onClick={() => setActiveTab('campaign')}>
              {t('pages.gameRoom.layout.tabs.campaign')}
            </button>
            <button className="return-menu-btn" onClick={() => setShowExitWarning(true)}>
              {t('pages.gameRoom.layout.tabs.returnToMenu', 'Return to Menu')}
            </button>
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