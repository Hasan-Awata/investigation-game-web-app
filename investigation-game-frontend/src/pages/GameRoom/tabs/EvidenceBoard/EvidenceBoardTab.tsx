import { useState } from 'react';
import { useRoomState, useRoomActions } from '@/context/RoomContext';
import { useInvestigationRequest } from '@/hooks/useInvestigationRequest';
import type { Evidence } from '@/types';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal'; 
import ProceduralRequestTray from './ProceduralRequestTray';
import './EvidenceBoardTab.css';

export default function EvidenceBoardTab() {
  const { room, accumulatedEvidences, viewedEvidences } = useRoomState();
  const { markEvidenceAsViewed, refreshRoomData } = useRoomActions();
  
  const [inspectedEvidence, setInspectedEvidence] = useState<Evidence | null>(null);

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

  const handleInspect = (evidence: Evidence) => {
    setInspectedEvidence(evidence);
    markEvidenceAsViewed(evidence.id);
  };

  const handleDragOverContainer = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const scrollContainer = e.currentTarget.closest('.tab-content-area');
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const threshold = 80;
    const speed = 15;

    if (e.clientY - rect.top < threshold) {
      scrollContainer.scrollTop -= speed;
    } else if (rect.bottom - e.clientY < threshold) {
      scrollContainer.scrollTop += speed;
    }
  };

  return (
    <div className="evidence-board-container" onDragOver={handleDragOverContainer}>
      <header className="board-header">
        <h2 className="section-title">The Evidence Board</h2>
        <span className="board-meta">Drag files to the tray below to request warrants or subpoenas.</span>
      </header>
      
      {feedback && (
        <div className="feedback-modal-overlay" style={{ zIndex: 1000 }}>
          <div className={`feedback-modal-content ${feedback.type}`}>
            <h3 className="feedback-title">
              {feedback.type === 'success' ? 'Request Approved' : 'Request Denied'}
            </h3>
            <p className="feedback-message">{feedback.message}</p>
            <button className="btn-secondary mt-1" onClick={clearFeedback}>Acknowledge</button>
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
          <div className="terminal-text">No evidence recovered for this phase.</div>
        ) : (
          <div className="evidence-scatter-grid">
            {accumulatedEvidences.map((evidence: Evidence, index: number) => (
              <EvidenceCard 
                key={evidence.id} 
                evidence={evidence} 
                index={index}
                isNew={!viewedEvidences.has(evidence.id)} 
                onInspect={handleInspect} 
              />
            ))}
          </div>
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
  );
}