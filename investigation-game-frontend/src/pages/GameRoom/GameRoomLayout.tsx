import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  defaultDropAnimationSideEffects 
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

import { useRoomData, useRoomUI } from '@/context/RoomContext';
import type { ToastNotification } from '@/context/RoomContext';
import { leaveRoom } from '@/services/api';
import { useInvestigationRequest } from '@/hooks/useInvestigationRequest';
import { useSuspectVerdict } from '@/hooks/useSuspectVerdict';

import CaseDetailsTab from './tabs/CaseDetails/CaseDetailsTab';
import EvidenceBoardTab from './tabs/EvidenceBoard/EvidenceBoardTab';
import PersonsOfInterestTab from './tabs/Characters/CharactersTab';
import CampaignTab from './tabs/Campaign/CampaignTab';
import AgentNotepad from '@/pages/GameRoom/components/AgentNotepad/AgentNotepad';
import ProceduralRequestTray from './components/ProceduralRequestTray/ProceduralRequestTray';
import { EvidenceCardOverlay } from './tabs/EvidenceBoard/EvidenceCard';
import { CharacterCardOverlay } from './tabs/Characters/CharacterCard';
import GameEndOverlay from './components/GameEffects/GameEndOverlay';
import styles from './GameRoomLayout.module.css';

type Tab = 'details' | 'evidences' | 'campaign' | 'characters';
type SidebarTab = 'ledger' | 'agents' | 'procedural';

interface GameRoomLayoutProps {
  resolutionMessage: string | null;
  finalStats: any;
  toasts: ToastNotification[];
}

export default function GameRoomLayout({ resolutionMessage, finalStats, toasts }: GameRoomLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { room, accumulatedEvidences, accumulatedCharacters, refreshRoomData } = useRoomData();
  const { viewedEvidences, viewedCharacters, globalFeedback, setGlobalFeedback, setGameOverData } = useRoomUI();

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('procedural');
  const [isCopied, setIsCopied] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Global Drag & Drop State
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [activeDragType, setActiveDragType] = useState<'EVIDENCE' | 'CHARACTER' | null>(null);
  const [activeDragSource, setActiveDragSource] = useState<'unassigned' | 'guilty' | null>(null);

  const {
    trayEvidences, requestType, setRequestType, addToTray, removeFromTray,
    isSubmitting, feedback: requestFeedback, toasts: requestToasts,
    clearFeedback: clearRequestFeedback, submitRequest, filedRequests
  } = useInvestigationRequest(room, refreshRoomData);

  const {
    guiltyIds, feedback: characterFeedback, isSubmitting: isCharacterSubmitting,
    handleCharacterDrop, submitVerdict, clearFeedback: clearCharacterFeedback
  } = useSuspectVerdict(room, refreshRoomData, setGameOverData);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { type, characterId, sourcePool } = event.active.data.current || {};
    
    setActiveDragType(type || 'EVIDENCE');
    setActiveDragId(type === 'CHARACTER' ? characterId : (event.active.id as number));
    setActiveDragSource(sourcePool || null);

    if (type === 'EVIDENCE' && sidebarTab !== 'procedural') {
      setSidebarTab('procedural');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over) {
      const dragType = active.data.current?.type;
      
      if (dragType === 'EVIDENCE' && over.id === 'procedural-tray') {
        addToTray(active.id as number);
      } else if (dragType === 'CHARACTER') {
        const charId = active.data.current?.characterId;
        if (over.id === 'guilty-zone') handleCharacterDrop(charId, 'guilty');
        if (over.id === 'unassigned-zone') handleCharacterDrop(charId, 'unassigned');
      }
    }

    setActiveDragId(null);
    setActiveDragType(null);
    setActiveDragSource(null);
  };

  const activeEvidence = useMemo(() => 
    activeDragType === 'EVIDENCE' ? accumulatedEvidences.find((ev) => ev.id === activeDragId) : null, 
  [accumulatedEvidences, activeDragId, activeDragType]);

  const activeCharacter = useMemo(() => 
    activeDragType === 'CHARACTER' ? accumulatedCharacters.find((c) => c.id === activeDragId) : null, 
  [accumulatedCharacters, activeDragId, activeDragType]);

  const hasUnreadEvidence = accumulatedEvidences.some(ev => !viewedEvidences.has(ev.id));
  const hasUnreadCharacters = accumulatedCharacters.some(c => !viewedCharacters.has(c.id));
  const allToasts = [...toasts, ...requestToasts];

  const maxStrikes = room.game_case?.max_strikes || 5;
  const currentStrikes = room.strikes || 0;
  const radius = 20; 
  const circumference = 2 * Math.PI * radius;
  const segmentLength = Math.max(0, (circumference / maxStrikes) - 3.5);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={styles.layoutContainer}>
        
        {globalFeedback && (
          <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
            <div className={`feedback-modal-content ${globalFeedback.type}`}>
              <h3 className="feedback-title">{globalFeedback.title}</h3>
              <p className="feedback-message">{globalFeedback.message}</p>
              <button className="btn-secondary mt-1" onClick={() => setGlobalFeedback(null)}>
                {t('pages.gameRoom.layout.acknowledge')}
              </button>
            </div>
          </div>
        )}

        {requestFeedback && (
          <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
            <div className={`feedback-modal-content ${requestFeedback.type}`}>
              <h3 className="feedback-title">
                {requestFeedback.type === 'success' ? t('pages.gameRoom.evidence.board.requestApproved') : t('pages.gameRoom.evidence.board.requestDenied')}
              </h3>
              <p className="feedback-message">{requestFeedback.message}</p>
              <button className="btn-secondary mt-1" onClick={clearRequestFeedback}>
                {t('pages.gameRoom.evidence.board.acknowledge')}
              </button>
            </div>
          </div>
        )}

        {showExitWarning && (
          <div className="feedback-modal-overlay" style={{ zIndex: 9999 }}>
            <div className="feedback-modal-content error">
              <h3 className="feedback-title">{t('pages.gameRoom.layout.exitWarningTitle', 'Abandon Investigation?')}</h3>
              <p className="feedback-message">{t('pages.gameRoom.layout.exitWarningDesc')}</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn-secondary" onClick={() => setShowExitWarning(false)}>{t('pages.gameRoom.layout.stay', 'Maintain Connection')}</button>
                <button className="btn-primary" style={{ background: 'var(--accent-crimson)', borderColor: 'var(--accent-crimson)', color: 'var(--bg-dark)' }} onClick={handleLeaveSession} disabled={isLeaving}>
                  {isLeaving ? t('pages.gameRoom.layout.leaving', 'Severing...') : t('pages.gameRoom.layout.leave', 'Sever Connection')}
                </button>
              </div>
            </div>
          </div>
        )}

        {createPortal(
          <div className="toast-container">
            {allToasts.map((toast) => (
              <div key={toast.id} className="system-toast-notification">
                <div className="toast-icon pulse-icon"><img src={toast.icon} alt={toast.type} className="toast-svg-graphic" /></div>
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

        <aside className={styles.sidebarPanel}>
          <div className={styles.sidebarSection}>
            <div className={styles.sidebarHeadingWrapper}>
              <h3 className={styles.sidebarHeading}>{t('gameRoom.sessionCode')}</h3>
              <button className={`${styles.copyBtn} ${isCopied ? styles.copied : ''}`} onClick={handleCopyCode}>
                {isCopied ? '✓' : '⧉'}
              </button>
            </div>
            <div className={styles.inviteCodeDisplay}>{room.invite_code}</div>
          </div>

          <div className={`${styles.sidebarSection} ${styles.sidebarFlexSection}`}>
            <div className={styles.sidebarToggleHeader}>
              <button
                className={`${styles.toggleIconBtn} ${sidebarTab === 'ledger' ? styles.activeToggle : ''}`}
                onClick={() => setSidebarTab('ledger')} title={t('components.agentNotepad.fieldLedger', 'Field Ledger')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
              </button>
              <button
                className={`${styles.toggleIconBtn} ${sidebarTab === 'agents' ? styles.activeToggle : ''}`}
                onClick={() => setSidebarTab('agents')} title={t('gameRoom.activeAgents')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18" /><path d="M6 12l1.5-6h9l1.5 6" /><path d="M12 12v3" /><circle cx="8.5" cy="16.5" r="2.5" /><circle cx="15.5" cy="16.5" r="2.5" /><path d="M11 16.5h2" /></svg>
              </button>
              <button
                className={`${styles.toggleIconBtn} ${sidebarTab === 'procedural' ? styles.activeToggle : ''}`}
                onClick={() => setSidebarTab('procedural')} title={t('pages.gameRoom.evidence.board.proceduralTrayTitle', 'Procedural Requests')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                  <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                  <path d="M7 21h10"/>
                  <path d="M12 3v18"/>
                  <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
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
              ) : sidebarTab === 'procedural' ? (
                <ProceduralRequestTray
                  accumulatedEvidences={accumulatedEvidences}
                  trayEvidences={trayEvidences}
                  requestType={requestType}
                  setRequestType={setRequestType}
                  addToTray={addToTray}
                  removeFromTray={removeFromTray}
                  isSubmitting={isSubmitting}
                  submitRequest={submitRequest}
                  filedRequests={filedRequests}
                />
              ) : (
                <AgentNotepad roomId={room.id} />
              )}
            </div>
          </div>
        </aside>

        <main className={styles.workspacePanel}>
          <div className={styles.strikesIndicator}>
            <div className={styles.strikesTooltip}>{currentStrikes}/{maxStrikes} {t('gameRoom.strikes')}</div>
            <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
              {[...Array(maxStrikes)].map((_, i) => {
                const offset = (circumference / maxStrikes) * i;
                return (
                  <circle key={i} cx="25" cy="25" r={radius} fill="none"
                    stroke={i < currentStrikes ? 'var(--accent-crimson, #ff4444)' : 'rgba(255, 255, 255, 0.15)'}
                    strokeWidth="6" strokeDasharray={`${segmentLength} ${circumference - segmentLength}`} strokeDashoffset={-offset}
                  />
                );
              })}
            </svg>
          </div>

          <header className={styles.workspaceHeader}>
            <nav className={styles.navbar}>
              <div className={styles.navLinks}>
                <button className={`${styles.tabBtn} ${activeTab === 'details' ? styles.activeTab : ''}`} onClick={() => setActiveTab('details')}>
                  {t('pages.gameRoom.layout.tabs.caseDetails')}
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'evidences' ? styles.activeTab : ''}`} onClick={() => setActiveTab('evidences')}>
                  {t('pages.gameRoom.layout.tabs.evidences')}
                  {hasUnreadEvidence && <div className={styles.unreadIndicator} title={t('pages.gameRoom.layout.tabs.unreadIntel')}></div>}
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'characters' ? styles.activeTab : ''}`} onClick={() => setActiveTab('characters')}>
                  {t('pages.gameRoom.layout.tabs.personsOfInterest', 'Persons of Interest')}
                  {hasUnreadCharacters && <div className={styles.unreadIndicator} title={t('pages.gameRoom.layout.tabs.unreadIntel')}></div>}
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'campaign' ? styles.activeTab : ''}`} onClick={() => setActiveTab('campaign')}>
                  {t('pages.gameRoom.layout.tabs.campaign')}
                </button>
              </div>
              <button className={styles.actionBlockBtn} onClick={() => setShowExitWarning(true)}>{t('pages.gameRoom.layout.tabs.returnToMenu', 'Exit')}</button>
            </nav>
          </header>

          <div className={styles.tabContentArea}>
            {activeTab === 'details' && <CaseDetailsTab />}
            {activeTab === 'evidences' && <EvidenceBoardTab />}
            {activeTab === 'characters' && (
              <PersonsOfInterestTab 
                guiltyIds={guiltyIds}
                isSubmitting={isCharacterSubmitting}
                feedback={characterFeedback}
                submitVerdict={submitVerdict}
                clearFeedback={clearCharacterFeedback}
              />
            )}
            {activeTab === 'campaign' && <CampaignTab />}
          </div>
        </main>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
          duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeDragType === 'EVIDENCE' && activeEvidence ? (
            <EvidenceCardOverlay evidence={activeEvidence} />
          ) : null}
          
          {activeDragType === 'CHARACTER' && activeCharacter ? (
            <CharacterCardOverlay character={activeCharacter} sourcePool={activeDragSource || 'unassigned'} />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}