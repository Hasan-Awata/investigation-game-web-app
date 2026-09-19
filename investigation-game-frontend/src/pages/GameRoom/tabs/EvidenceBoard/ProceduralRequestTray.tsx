import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { InvestigationRequestType } from '@/types';
import type { Evidence } from '@/types';
import type { FiledRequest } from '@/hooks/useInvestigationRequest';
import styles from './ProceduralRequestTray.module.css';

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

  const { isOver, setNodeRef } = useDroppable({
    id: 'procedural-tray'
  });

  return (
    <div className={`${styles.filingTray} glass-panel`}>
      <div className={styles.trayHeader}>
        <span className="forensic-icon">⚖️</span>
        <h3>{t('pages.gameRoom.evidence.board.proceduralTrayTitle')}</h3>
      </div>

      <div className={styles.trayLayout}>
        <div 
          ref={setNodeRef} 
          className={`${styles.trayDropzone} ${isOver ? styles.isDragOver : ''}`}
        >
          {trayEvidences.length === 0 ? (
            <span className={styles.trayPlaceholder}>{t('pages.gameRoom.evidence.board.dragAndDrop')}</span>
          ) : (
            <div className={styles.trayItems}>
              {trayEvidences.map(id => {
                const ev = accumulatedEvidences.find(e => e.id === id);
                return (
                  <div key={id} className={styles.trayItemPill}>
                    <span className={styles.trayItemId}>EX-{id.toString().padStart(3, '0')}</span>
                    <span className={styles.trayItemTitle}>{ev?.title || t('pages.gameRoom.evidence.board.unknownFile')}</span>
                    <button className={styles.trayItemRemove} onClick={() => removeFromTray(id)}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.trayActions}>
          <select
            className={`admin-input ${styles.traySelect}`}
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
            className={`btn-primary ${styles.traySubmitBtn}`}
            disabled={trayEvidences.length < 2 || !requestType || isSubmitting}
            onClick={() => submitRequest()}
          >
            {isSubmitting ? t('pages.gameRoom.evidence.board.filing') : t('pages.gameRoom.evidence.board.submitToDa')}
          </button>
        </div>
      </div>

      <div className={styles.trayFooterActions}>
        <button className={styles.archiveToggleBtn} onClick={() => setShowArchive(!showArchive)}>
          📁 {showArchive ? t('pages.gameRoom.evidence.board.hideFiled') : `${t('pages.gameRoom.evidence.board.viewFiled')} (${filedRequests.length})`}
        </button>
      </div>

      {showArchive && (
        <div className={styles.filedRequestsDrawer}>
          {filedRequests.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>
              {t('pages.gameRoom.evidence.board.noRequestsFiled')}
            </div>
          ) : (
            filedRequests.map(req => (
              <div key={req.id} className={styles.filedRequestRow}>
                <div className={styles.filedRequestInfo}>
                  <span className={styles.filedRequestType}>
                    {t(`pages.gameRoom.evidence.board.requestTypes.${req.request_type}`)}
                  </span>
                  <span className={styles.filedRequestMeta}>
                    {t('pages.gameRoom.evidence.board.crossReferenced')} {req.evidence_ids.map(id => `EX-${id.toString().padStart(3, '0')}`).join(', ')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={styles.filedRequestStatus}>{t('pages.gameRoom.evidence.board.approvedStatus')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}