import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRoomData, useRoomUI } from '@/context/RoomContext';
import type { ToastNotification } from '@/context/RoomContext';
import { leaveRoom } from '@/services/api';
import CaseDetailsTab from './tabs/CaseDetails/CaseDetailsTab';
import EvidenceBoardTab from './tabs/EvidenceBoard/EvidenceBoardTab';
import PersonsOfInterestTab from './tabs/Characters/CharactersTab';
import CampaignTab from './tabs/Campaign/CampaignTab';
import AgentNotepad from '@/components/AgentNotepad/AgentNotepad';
import GameEndOverlay from './components/GameEndOverlay';
import styles from './GameRoomLayout.module.css';

type Tab = 'details' | 'evidences' | 'campaign' | 'characters';
type SidebarTab = 'ledger' | 'agents';

interface GameRoomLayoutProps {
  resolutionMessage: string | null;
  finalStats: any;
  toasts: ToastNotification[];
}

export default function GameRoomLayout({ resolutionMessage, finalStats, toasts }: GameRoomLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { room, accumulatedEvidences, accumulatedCharacters } = useRoomData();
  const { viewedEvidences, viewedCharacters, globalFeedback, setGlobalFeedback } = useRoomUI();

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('ledger');
  const [isCopied, setIsCopied] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; 
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

    await leaveRoom(room.id);

    Object.keys(sessionStorage).forEach(key => {
      if (key.includes(`room_${room.invite_code}`) || key.includes(`room_${room.id}`)) {
        sessionStorage.removeItem(key);
      }
    });

    navigate('/');
  };

  const hasUnreadEvidence = accumulatedEvidences.some(evidence => !viewedEvidences.has(evidence.id));
  const hasUnreadCharacters = accumulatedCharacters.some(character => !viewedCharacters.has(character.id));

  // --- SVG Split Circle Math ---
  const maxStrikes = room.game_case?.max_strikes || 5;
  const currentStrikes = room.strikes || 0;
  const radius = 20; 
  const circumference = 2 * Math.PI * radius;
  const gap = 3.5; 
  const segmentLength = Math.max(0, (circumference / maxStrikes) - gap);

  return (
    <div className={styles.layoutContainer}>
      
      {/* Shared Feedback Overlays */}
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

      {/* --- Sidebar Panel --- */}
      <aside className={styles.sidebarPanel}>
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarHeadingWrapper}>
            <h3 className={styles.sidebarHeading}>{t('gameRoom.sessionCode')}</h3>
            <button
              className={`${styles.copyBtn} ${isCopied ? styles.copied : ''}`}
              onClick={handleCopyCode}
              title="Copy Invite Code"
            >
              {isCopied ? '✓' : '⧉'}
            </button>
          </div>
          <div className={styles.inviteCodeDisplay}>{room.invite_code}</div>
        </div>

        {/* --- Merged Ledger/Agents Section --- */}
        <div className={`${styles.sidebarSection} ${styles.sidebarFlexSection}`}>
          <div className={styles.sidebarToggleHeader}>
            <button
              className={`${styles.toggleIconBtn} ${sidebarTab === 'ledger' ? styles.activeToggle : ''}`}
              onClick={() => setSidebarTab('ledger')}
              title={t('components.agentNotepad.fieldLedger', 'Field Ledger')}
            >
              {/* Notebook Icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </button>
            <button
              className={`${styles.toggleIconBtn} ${sidebarTab === 'agents' ? styles.activeToggle : ''}`}
              onClick={() => setSidebarTab('agents')}
              title={t('gameRoom.activeAgents')}
            >
              {/* Detective Icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18" />
                <path d="M6 12l1.5-6h9l1.5 6" />
                <path d="M12 12v3" />
                <circle cx="8.5" cy="16.5" r="2.5" />
                <circle cx="15.5" cy="16.5" r="2.5" />
                <path d="M11 16.5h2" />
              </svg>
            </button>
          </div>

          <div className={styles.sidebarToggleContent}>
            {sidebarTab === 'agents' ? (
              <ul className={styles.agentList}>
                {room.users ? room.users.map((participant: any) => (
                  <li key={participant.id} className={styles.agentItem}>
                    <span className={`${styles.agentRole} ${participant.role === 'host' ? styles.hostRole : styles.participantRole}`}></span>
                    {participant.user?.username || `Agent #${participant.user_id}`}
                  </li>
                )) : (
                  <li className={styles.agentItem}>
                    <span className={`${styles.agentRole} ${styles.hostRole}`}></span>
                    {t('pages.gameRoom.layout.host')} (ID: {room.host_user_id})
                  </li>
                )}
              </ul>
            ) : (
              <AgentNotepad roomId={room.id} />
            )}
          </div>
        </div>
      </aside>

      {/* --- Main Workspace --- */}
      <main className={styles.workspacePanel}>
        
        {/* Floating Strikes Indicator */}
        <div className={styles.strikesIndicator}>
          {/* Tooltip positioned before the SVG so it extends inwards, preventing clipping */}
          <div className={styles.strikesTooltip}>
            {currentStrikes}/{maxStrikes} {t('gameRoom.strikes')}
          </div>
          <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
            {[...Array(maxStrikes)].map((_, i) => {
              const offset = (circumference / maxStrikes) * i;
              return (
                <circle
                  key={i}
                  cx="25"
                  cy="25"
                  r={radius}
                  fill="none"
                  stroke={i < currentStrikes ? 'var(--accent-crimson, #ff4444)' : 'rgba(255, 255, 255, 0.15)'}
                  strokeWidth="6"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
        </div>

        {/* Absolute Floating Navbar */}
        <header className={styles.workspaceHeader}>
          <nav className={styles.navbar}>
            <div className={styles.navLinks}>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'details' ? styles.activeTab : ''}`} 
                onClick={() => setActiveTab('details')}
              >
                {t('pages.gameRoom.layout.tabs.caseDetails')}
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'evidences' ? styles.activeTab : ''}`} 
                onClick={() => setActiveTab('evidences')}
              >
                {t('pages.gameRoom.layout.tabs.evidences')}
                {hasUnreadEvidence && <div className={styles.unreadIndicator} title={t('pages.gameRoom.layout.tabs.unreadIntel')}></div>}
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'characters' ? styles.activeTab : ''}`} 
                onClick={() => setActiveTab('characters')}
              >
                {t('pages.gameRoom.layout.tabs.personsOfInterest', 'Persons of Interest')}
                {hasUnreadCharacters && <div className={styles.unreadIndicator} title={t('pages.gameRoom.layout.tabs.unreadIntel')}></div>}
              </button>
              <button 
                className={`${styles.tabBtn} ${activeTab === 'campaign' ? styles.activeTab : ''}`} 
                onClick={() => setActiveTab('campaign')}
              >
                {t('pages.gameRoom.layout.tabs.campaign')}
              </button>
            </div>
            
            <button className={styles.actionBlockBtn} onClick={() => setShowExitWarning(true)}>
              {t('pages.gameRoom.layout.tabs.returnToMenu', 'Exit')}
            </button>
          </nav>
        </header>

        <div className={styles.tabContentArea}>
          {activeTab === 'details' && <CaseDetailsTab />}
          {activeTab === 'evidences' && <EvidenceBoardTab />}
          {activeTab === 'characters' && <PersonsOfInterestTab />}
          {activeTab === 'campaign' && <CampaignTab />}
        </div>
      </main>
    </div>
  );
}