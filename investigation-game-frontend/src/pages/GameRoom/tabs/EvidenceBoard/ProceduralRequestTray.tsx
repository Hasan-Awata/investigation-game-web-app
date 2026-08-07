import React from 'react';
import { InvestigationRequestType, getInvestigationRequestLabel } from '@/types';
import type { Evidence } from '@/types';
import './ProceduralRequestTray.css';

interface ProceduralRequestTrayProps {
  accumulatedEvidences: Evidence[];
  trayEvidences: number[];
  requestType: string;
  setRequestType: (type: string) => void;
  addToTray: (id: number) => void;
  removeFromTray: (id: number) => void;
  isSubmitting: boolean;
  submitRequest: () => void;
}

export default function ProceduralRequestTray({
  accumulatedEvidences,
  trayEvidences,
  requestType,
  setRequestType,
  addToTray,
  removeFromTray,
  isSubmitting,
  submitRequest
}: ProceduralRequestTrayProps) {
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const evidenceId = parseInt(e.dataTransfer.getData('evidenceId'), 10);
    if (!isNaN(evidenceId)) addToTray(evidenceId);
  };

  return (
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
            className="admin-input tray-select" 
            value={requestType} 
            onChange={(e) => setRequestType(e.target.value)}
          >
            <option value="" disabled>-- Select Request Type --</option>
            {Object.values(InvestigationRequestType).map(type => (
              <option key={type} value={type}>{getInvestigationRequestLabel(type)}</option>
            ))}
          </select>
          
          <button 
            className="btn-primary tray-submit-btn" 
            disabled={trayEvidences.length < 2 || !requestType || isSubmitting}
            onClick={() => submitRequest()}
          >
            {isSubmitting ? 'Filing...' : 'Submit Request to DA'}
          </button>
        </div>
      </div>
    </div>
  );
}