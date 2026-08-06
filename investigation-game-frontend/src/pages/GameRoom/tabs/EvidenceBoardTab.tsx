import { useState } from 'react';
import type { Evidence } from '../../../types';
import { useRoomContext } from '../../../context/RoomContext';
import { useInvestigationRequest } from '../../../hooks/useInvestigationRequest';
import { InvestigationRequestType, getInvestigationRequestLabel } from '../../../types';
import EvidenceCard from './EvidenceCard';
import EvidenceModal from './EvidenceModal'; 
import './EvidenceBoard.css';

export default function EvidenceBoardTab() {
  const { room, accumulatedEvidences, viewedEvidences, markEvidenceAsViewed, refreshRoomData } = useRoomContext();
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
    submitRequest
  } = useInvestigationRequest(room, refreshRoomData);

  const handleInspect = (evidence: Evidence) => {
    setInspectedEvidence(evidence);
    markEvidenceAsViewed(evidence.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const evidenceId = parseInt(e.dataTransfer.getData('evidenceId'), 10);
    if (!isNaN(evidenceId)) addToTray(evidenceId);
  };

  return (
    <div className="evidence-board-container">
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
            {accumulatedEvidences.map((evidence, index) => (
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

      {/* TACTICAL FILING TRAY */}
      <div className="filing-tray glass-panel" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        <div className="tray-header">
          <span className="forensic-icon">⚖️</span>
          <h3>Procedural Request Tray</h3>
        </div>
        
        <div className="tray-layout">
          <div className="tray-dropzone">
            {trayEvidences.length === 0 ? (
              <span className="tray-placeholder">Drag & Drop Evidence Here</span>
            ) : (
              <div className="tray-items">
                {trayEvidences.map(id => {
                  const ev = accumulatedEvidences.find(e => e.id === id);
                  return (
                    <div key={id} className="tray-item-pill">
                      <span className="tray-item-id">EX-{id.toString().padStart(3, '0')}</span>
                      <span className="tray-item-title">{ev?.title || 'Unknown File'}</span>
                      <button className="tray-item-remove" onClick={() => removeFromTray(id)}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="tray-actions">
            <select 
              className="admin-input" 
              value={requestType} 
              onChange={(e) => setRequestType(e.target.value)}
              style={{ width: '100%', marginBottom: '1rem', background: 'rgba(0,0,0,0.5)' }}
            >
              <option value="" disabled>-- Select Request Type --</option>
              {Object.values(InvestigationRequestType).map(type => (
                <option key={type} value={type}>{getInvestigationRequestLabel(type)}</option>
              ))}
            </select>
            
            <button 
              className="btn-primary" 
              disabled={trayEvidences.length < 2 || !requestType || isSubmitting}
              onClick={() => submitRequest()}
              style={{ width: '100%' }}
            >
              {isSubmitting ? 'Filing...' : 'Submit Request to DA'}
            </button>
          </div>
        </div>
      </div>

      <EvidenceModal evidence={inspectedEvidence} onClose={() => setInspectedEvidence(null)} />
    </div>
  );
}