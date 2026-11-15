import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Evidence } from '@/types/evidence';
import UniversalDocViewer from './DocViewer/UniversalDocViewer';
import TerminalViewer from './TerminalViewer/TerminalViewer';
import TestimonyViewer from './Viewers/TestimonyViewer';
import MediaViewer from './Viewers/MediaViewer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EvidenceContext } from './EvidenceContext';
import styles from './EvidenceModal.module.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  return evidence ? <ActiveEvidenceModal key={evidence.id} evidence={evidence} onClose={onClose} /> : null;
}

function ActiveEvidenceModal({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  const toggleFullscreen = () => setIsFullscreen(value => !value);
  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    closeTimer.current = setTimeout(onClose, 160);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      handleClose();
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), audio[controls], video[controls], [tabindex="0"]'
    ) ?? []).filter(element => !element.closest('[hidden], [inert]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
      event.preventDefault(); first.focus();
    }
  };

  const renderEvidenceContent = () => {
    const ViewerComponents: Record<string, React.ElementType> = {
      forensic: UniversalDocViewer,
      document: UniversalDocViewer,
      digital: TerminalViewer,
      testimony: TestimonyViewer,
      image: MediaViewer,
      audio: MediaViewer,
    } as const;

    const Viewer = ViewerComponents[evidence.evidence_type as keyof typeof ViewerComponents];

    if (Viewer) {
      return <Viewer evidence={evidence as { id: number; metadata?: unknown }} />;
    }

    return (
      <section role="status" style={{ padding: '2rem', color: 'var(--text-primary, #f5f5f5)' }}>
        <h2>{evidence.title || 'Evidence'}</h2>
        {evidence.description && <p>{evidence.description}</p>}
      </section>
    );
  };

  return (
    <div className={styles.evidenceModalOverlay} data-closing={closing || undefined} onClick={handleClose}>
      <div 
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={handleKeyDown}
        className={`${styles.evidenceModalContent} ${isFullscreen ? styles.fullscreenModal : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 id={titleId} className={styles.modalTitle}>{evidence.title || t('pages.gameRoom.evidence.modal.title')}</h2>

          <div className={styles.modalActions}>
            <button
              className={styles.modalFullscreenBtn}
              onClick={toggleFullscreen}
              type="button" aria-pressed={isFullscreen}
              aria-label={t(`pages.gameRoom.evidence.modal.${isFullscreen ? 'minimize' : 'fullscreen'}`)}
              title={t(`pages.gameRoom.evidence.modal.${isFullscreen ? 'minimize' : 'fullscreen'}`)}
            >
              {isFullscreen ? (
                // Inward pointing arrows (Minimize)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              ) : (
                // Outward pointing arrows (Maximize)
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                </svg>
              )}
            </button>

            <button 
              className={styles.modalCloseBtn} 
              onClick={handleClose} 
              type="button" aria-label={t('pages.gameRoom.evidence.modal.close')} title={t('pages.gameRoom.evidence.modal.close')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.modalBody}>
          <ErrorBoundary
            isLocal={true}
            fallbackMessage={`Evidence metadata payload for EX-${evidence.id.toString().padStart(3, '0')} is corrupted or malformed. Asset viewing aborted.`}
          >
            <EvidenceContext.Provider value={{ isFullscreen }}>
              {renderEvidenceContent()}
            </EvidenceContext.Provider>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
