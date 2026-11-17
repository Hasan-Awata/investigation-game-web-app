import { Fragment, useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import type { Character, Evidence, InvestigationRequestType, ProceduralRequest } from '@/types';
import PopupAction from '@/components/PopupAction';
import { notificationIcons } from '@/components/notificationIcons';
import styles from './ProceduralRequestTray.module.css';

interface ProceduralRequestTrayProps {
  accumulatedEvidences: Evidence[];
  accumulatedCharacters: Character[];
  trayEvidences: number[];
  trayCharacters: number[];
  selectedRequestId: number | null;
  selectRequest: (id: number) => void;
  proceduralRequests: ProceduralRequest[];
  completedRequestIds: number[];
  isRoomActive: boolean;
  removeItem: (id: number, type: 'evidence' | 'character') => void;
  isSubmitting: boolean;
  submitRequest: () => void;
}

const requestTypeDrawings = {
  search_warrant: <><circle cx="10" cy="10" r="6" /><path d="m14.5 14.5 6 6" /></>,
  financial_records: <><path d="M14 3H5v18h14V8l-5-5v5h5M8 17v-3m4 3v-6m4 6v-4" /></>,
  dna_test: <><path d="M7 3c0 8 10 10 10 18M17 3c0 8-10 10-10 18M8 6h8M9 9h6M9 15h6M8 18h8" /></>,
  phone_records: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 5h4M11 19h2M9 9h6M9 12h6M9 15h3" /></>,
} satisfies Record<InvestigationRequestType, ReactNode>;

export default function ProceduralRequestTray({
  accumulatedEvidences, accumulatedCharacters, trayEvidences, trayCharacters,
  selectedRequestId, selectRequest, proceduralRequests, completedRequestIds,
  isRoomActive, removeItem, isSubmitting, submitRequest,
}: ProceduralRequestTrayProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const selectedCardRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const card = selectedCardRef.current;
    if (!card) return;
    card.focus({ preventScroll: true });
    card.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
  }, [selectedRequestId]);
  const isLocked = isSubmitting || !isRoomActive;
  const { isOver, setNodeRef } = useDroppable({ id: 'procedural-tray', disabled: isLocked });
  const selectedRequest = proceduralRequests.find(request => request.id === selectedRequestId);
  const requestGroups = [
    { approved: false, requests: proceduralRequests.filter(request => !completedRequestIds.includes(request.id)) },
    { approved: true, requests: proceduralRequests.filter(request => completedRequestIds.includes(request.id)) },
  ].filter(group => group.requests.length > 0);
  const totalItems = trayEvidences.length + trayCharacters.length;
  const requestLabel = (request: ProceduralRequest) => request.title
    || t(`pages.gameRoom.evidence.board.requestTypes.${request.request_type}`);
  const items = [
    ...trayEvidences.map(id => ({ id, type: 'evidence' as const, title: accumulatedEvidences.find(item => item.id === id)?.title
      ?? t('pages.gameRoom.evidence.board.unknownFile') })),
    ...trayCharacters.map(id => ({ id, type: 'character' as const, title: accumulatedCharacters.find(item => item.id === id)?.name
      ?? `CH-${id.toString().padStart(3, '0')}` })),
  ];

  return (
    <div className={styles.sidebarTrayContainer}>
      <div className={styles.analysis} aria-busy={isSubmitting}>
        <div ref={setNodeRef} className={`${styles.trayDropzone} ${isOver ? styles.isDragOver : ''}`}>
          {items.length === 0 ? (
            <div className={styles.trayPlaceholder}>
              {notificationIcons.proceduralApproved}
              <span>{t('pages.gameRoom.evidence.board.dragAndDrop')}</span>
            </div>
          ) : (
            <ul className={styles.trayItems}>
              {items.map(item => (
                <li key={`${item.type}-${item.id}`} className={styles.trayItem}>
                  <span className={styles.trayItemTitle}><bdi>{item.title}</bdi></span>
                  <button type="button" className={styles.trayItemRemove} disabled={isLocked}
                    aria-label={t('pages.gameRoom.evidence.board.removeItem', { title: item.title })}
                    onClick={() => removeItem(item.id, item.type)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <PopupAction primary className={styles.applyButton} disabled={totalItems < 2 || !selectedRequest
          || completedRequestIds.includes(selectedRequest.id) || isLocked} onClick={submitRequest}>
          {isSubmitting && <span className={styles.loadingIcon}>{notificationIcons.loading}</span>}
          {isSubmitting ? t('pages.gameRoom.evidence.board.filing') : t('pages.gameRoom.evidence.board.apply')}
        </PopupAction>
        <span className={styles.srOnly} role="status">{isSubmitting ? t('pages.gameRoom.evidence.board.filing') : ''}</span>
      </div>

      <section className={styles.requestSection} aria-labelledby={headingId}>
        <h3 id={headingId} className={styles.srOnly}>{t('pages.gameRoom.evidence.board.availableRequests')}</h3>
        {proceduralRequests.length === 0 ? <p className={styles.emptyText}>{t('pages.gameRoom.evidence.board.noAvailableRequests')}</p> : (
          requestGroups.map(({ approved, requests }, groupIndex) => (
            <Fragment key={String(approved)}>
              {groupIndex > 0 && <hr className={styles.requestDivider} />}
              <ul className={styles.requestList}>
                {requests.map(request => (
                  <li key={request.id}>
                    <button type="button" className={styles.requestRow} aria-pressed={selectedRequestId === request.id}
                      ref={selectedRequestId === request.id ? selectedCardRef : null}
                      data-approved={approved} disabled={approved || isLocked} onClick={() => selectRequest(request.id)}>
                      <svg className={styles.requestIcon} viewBox="0 0 24 24" width="22" height="22" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                        {requestTypeDrawings[request.request_type]}
                      </svg>
                      <span className={styles.requestCopy}>
                        <span className={styles.requestTitle}>
                          {t(`pages.gameRoom.evidence.board.requestTypes.${request.request_type}`)}
                        </span>
                        <span className={styles.requestMeta}><bdi>{requestLabel(request)}</bdi></span>
                      </span>
                      <span className={styles.srOnly}>
                        {t(approved ? 'pages.gameRoom.evidence.board.approvedStatus' : 'pages.gameRoom.evidence.board.pendingStatus')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Fragment>
          ))
        )}
      </section>
    </div>
  );
}
