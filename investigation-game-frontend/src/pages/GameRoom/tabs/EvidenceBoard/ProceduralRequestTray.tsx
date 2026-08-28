import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { InvestigationRequestType } from '@/types';
import type { Evidence } from '@/types';
import type { FiledRequest } from '@/hooks/useInvestigationRequest';
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
  filedRequests: FiledRequest[];
}

export default function ProceduralRequestTray({
  accumulatedEvidences,
  trayEvidences,
  requestType,
  setRequestType,
  removeFromTray,
  isSubmitting,
  submitRequest,
  filedRequests
}: ProceduralRequestTrayProps) {
  const { t } = useTranslation();
  const [showArchive, setShowArchive] = useState(false);

  // Register the dropzone with dnd-kit
  const { isOver, setNodeRef } = useDroppable({
    id: 'procedural-tray'
  });

  return (
    <div className="filing-tray glass-panel">
      <div className="tray-header">
        <span className="forensic-icon">⚖️</span>
        <h3>{t('pages.gameRoom.evidence.board.proceduralTrayTitle')}</h3>
      </div>

      <div className="tray-layout">
        {/* Bind the droppable ref to the dropzone area */}
        <div 
          ref={setNodeRef} 
          className={`tray-dropzone ${isOver ? 'is-drag-over' : ''}`}
          style={{ backgroundColor: isOver ? 'rgba(255, 255, 255, 0.15)' : 'transparent', transition: 'background-color 0.2s ease' }}
        >
          {trayEvidences.length === 0 ? (
            <span className="tray-placeholder">{t('pages.gameRoom.evidence.board.dragAndDrop')}</span>
          ) : (
            <div className="tray-items">
              {trayEvidences.map(id => {
                const ev = accumulatedEvidences.find(e => e.id === id);
                return (
                  <div key={id} className="tray-item-pill">
                    <span className="tray-item-id">EX-{id.toString().padStart(3, '0')}</span>
                    <span className="tray-item-title">{ev?.title || t('pages.gameRoom.evidence.board.unknownFile')}</span>
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
            <option value="" disabled>{t('pages.gameRoom.evidence.board.selectRequestType')}</option>
            {Object.values(InvestigationRequestType).map(type => (
              <option key={type} value={type}>
                {t(`pages.gameRoom.evidence.board.requestTypes.${type}`)}
              </option>
            ))}
          </select>

          <button
            className="btn-primary tray-submit-btn"
            disabled={trayEvidences.length < 2 || !requestType || isSubmitting}
            onClick={() => submitRequest()}
          >
            {isSubmitting ? t('pages.gameRoom.evidence.board.filing') : t('pages.gameRoom.evidence.board.submitToDa')}
          </button>
        </div>
      </div>

      <div className="tray-footer-actions">
        <button className="archive-toggle-btn" onClick={() => setShowArchive(!showArchive)}>
          📁 {showArchive ? t('pages.gameRoom.evidence.board.hideFiled') : `${t('pages.gameRoom.evidence.board.viewFiled')} (${filedRequests.length})`}
        </button>
      </div>

      {showArchive && (
        <div className="filed-requests-drawer">
          {filedRequests.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>
              {t('pages.gameRoom.evidence.board.noRequestsFiled')}
            </div>
          ) : (
            filedRequests.map(req => (
              <div key={req.id} className="filed-request-row">
                <div className="filed-request-info">
                  <span className="filed-request-type">
                    {t(`pages.gameRoom.evidence.board.requestTypes.${req.request_type}`)}
                  </span>
                  <span className="filed-request-meta">
                    {t('pages.gameRoom.evidence.board.crossReferenced')} {req.evidence_ids.map(id => `EX-${id.toString().padStart(3, '0')}`).join(', ')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="filed-request-status">{t('pages.gameRoom.evidence.board.approvedStatus')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}