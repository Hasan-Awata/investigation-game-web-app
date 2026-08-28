import React, { useState, useCallback, useMemo } from 'react';
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
import { useInvestigationRequest } from '@/hooks/useInvestigationRequest';
import type { Evidence } from '@/types';
import EvidenceCard, { EvidenceCardOverlay } from './EvidenceCard';
import EvidenceModal from './EvidenceModal';
import ProceduralRequestTray from './ProceduralRequestTray';
import './EvidenceBoardTab.css';

// MEMOIZATION: This severs the render cascade entirely. 
const EvidenceGrid = React.memo(({ 
  evidences, 
  viewedEvidences, 
  onInspect 
}: { 
  evidences: Evidence[]; 
  viewedEvidences: Set<number>; 
  onInspect: (evidence: Evidence) => void;
}) => {
  return (
    <div className="evidence-scatter-grid">
      {evidences.map((evidence, index) => (
        <EvidenceCard
          key={evidence.id}
          evidence={evidence}
          index={index}
          isNew={!viewedEvidences.has(evidence.id)}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
});

export default function EvidenceBoardTab() {
  const { t } = useTranslation();
  const { room, accumulatedEvidences, refreshRoomData } = useRoomData();
  const { viewedEvidences, markEvidenceAsViewed } = useRoomUI();

  const [inspectedEvidence, setInspectedEvidence] = useState<Evidence | null>(null);
  
  // Track dragging state for the DragOverlay
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  const {
    trayEvidences,
    requestType,
    setRequestType,
    addToTray,
    removeFromTray,
    isSubmitting,
    feedback,
    toasts,
    clearFeedback,
    submitRequest,
    filedRequests
  } = useInvestigationRequest(room, refreshRoomData);

  // Wrapped in useCallback to preserve strict equality for React.memo
  const handleInspect = useCallback((evidence: Evidence) => {
    setInspectedEvidence(evidence);
    markEvidenceAsViewed(evidence.id);
  }, [markEvidenceAsViewed]);

  // Configure Sensors for hybrid touch/mouse support without overriding clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // Allows standard clicks to pass through
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 }, // Optimizes for mobile tapping vs swiping
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // If the evidence was dropped over the 'procedural-tray' droppable area
    if (over && over.id === 'procedural-tray') {
      addToTray(active.id as number);
    }
    
    setActiveDragId(null);
  };

  const activeEvidence = useMemo(() => 
    accumulatedEvidences.find((ev) => ev.id === activeDragId), 
  [accumulatedEvidences, activeDragId]);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="evidence-board-container">
        <header className="board-header">
          <h2 className="section-title">{t('pages.gameRoom.evidence.board.title')}</h2>
          <span className="board-meta">{t('pages.gameRoom.evidence.board.subtitle')}</span>
        </header>

        {feedback && (
          <div className="feedback-modal-overlay" style={{ zIndex: 1000 }}>
            <div className={`feedback-modal-content ${feedback.type}`}>
              <h3 className="feedback-title">
                {feedback.type === 'success' ? t('pages.gameRoom.evidence.board.requestApproved') : t('pages.gameRoom.evidence.board.requestDenied')}
              </h3>
              <p className="feedback-message">{feedback.message}</p>
              <button className="btn-secondary mt-1" onClick={clearFeedback}>{t('pages.gameRoom.evidence.board.acknowledge')}</button>
            </div>
          </div>
        )}

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
        </div>

        <div className="acrylic-workspace">
          {accumulatedEvidences.length === 0 ? (
            <div className="terminal-text">{t('pages.gameRoom.evidence.board.noEvidence')}</div>
          ) : (
            <EvidenceGrid 
              evidences={accumulatedEvidences} 
              viewedEvidences={viewedEvidences} 
              onInspect={handleInspect} 
            />
          )}
        </div>

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

        <EvidenceModal evidence={inspectedEvidence} onClose={() => setInspectedEvidence(null)} />
      </div>

      {/* Renders the dragged clone seamlessly mapped to the user's cursor */}
      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
        duration: 250,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeEvidence ? <EvidenceCardOverlay evidence={activeEvidence} /> : null}
      </DragOverlay>
    </DndContext>
  );
}