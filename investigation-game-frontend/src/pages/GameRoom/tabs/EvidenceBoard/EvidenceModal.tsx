import { useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/icons/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/icons/CaretRight';
import type { Evidence } from '@/types/evidence';
import UniversalDocViewer from './DocViewer/UniversalDocViewer';
import TestimonyViewer from './Viewers/TestimonyViewer';
import MediaViewer from './Viewers/MediaViewer';
import EvidenceDialog from './EvidenceDialog';
import AudioEvidenceModal from './AudioEvidenceModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EvidenceContext } from './EvidenceContext';
import styles from './EvidenceModal.module.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  if (evidence?.evidence_type === 'audio') {
    return <AudioEvidenceModal key={evidence.id} evidence={evidence} onClose={onClose} />;
  }
  return evidence ? <ActiveEvidenceModal key={evidence.id} evidence={evidence} onClose={onClose} /> : null;
}

function ActiveEvidenceModal({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const updatePageCount = useCallback((count: number) => {
    setPageCount(count);
    setPageIndex(index => Math.min(index, count - 1));
  }, []);
  const showPageControls = isFullscreen && pageCount > 1 && (evidence.evidence_type === 'document' || evidence.evidence_type === 'forensic');
  const pageNumbers = new Intl.NumberFormat(i18n.language);
  const currentPage = pageNumbers.format(pageIndex + 1);
  const totalPages = pageNumbers.format(pageCount);
  const previousLabel = t('pages.gameRoom.evidence.modal.previousPage');
  const nextLabel = t('pages.gameRoom.evidence.modal.nextPage');
  const title = evidence.title || t('pages.gameRoom.evidence.modal.title');
  const closeLabel = t('pages.gameRoom.evidence.modal.close');
  const fullscreenLabel = t(isFullscreen ? 'pages.gameRoom.evidence.modal.minimize' : 'pages.gameRoom.evidence.modal.fullscreen');

  const renderEvidenceContent = () => {
    switch (evidence.evidence_type) {
      case 'document':
      case 'forensic':
        return <UniversalDocViewer evidence={evidence} pageSelection={{
          index: isFullscreen ? pageIndex : undefined, onPageCountChange: updatePageCount,
        }} />;
      case 'testimony':
        return <TestimonyViewer evidence={evidence} />;
      case 'image':
        return <MediaViewer evidence={evidence} />;
    }

    return (
      <section role="status" className={styles.fallback}>
        <h2 dir="auto">{title}</h2>
        {evidence.description && <p dir="auto">{evidence.description}</p>}
      </section>
    );
  };

  return (
    <EvidenceDialog
      titleId={titleId}
      className={isFullscreen ? styles.evidenceModalContent + ' ' + styles.fullscreenModal : styles.evidenceModalContent}
      onClose={onClose}
    >
      {dismiss => <>
        <header dir={i18n.dir()} className={showPageControls ? `${styles.modalHeader} ${styles.paginatedHeader}` : styles.modalHeader}>
          <h2 id={titleId} className={styles.modalTitle}><bdi>{title}</bdi></h2>

          {showPageControls && (
              <nav dir="ltr" className={styles.pageNavigation} aria-label={t('pages.gameRoom.evidence.modal.pageNavigation')}>
                <button type="button" className={styles.modalControlBtn} aria-label={previousLabel} title={previousLabel}
                  aria-disabled={pageIndex === 0} onClick={() => setPageIndex(index => Math.max(0, index - 1))}>
                  <CaretLeftIcon size={17} aria-hidden="true" />
                </button>
                <span className={styles.pageCounter} role="status" aria-atomic="true">
                  <span className={styles.visuallyHidden}>{t('pages.gameRoom.evidence.modal.pageStatus', { currentPage, totalPages })}</span>
                  <bdi dir="ltr" aria-hidden="true">{currentPage} / {totalPages}</bdi>
                </span>
                <button type="button" className={styles.modalControlBtn} aria-label={nextLabel} title={nextLabel}
                  aria-disabled={pageIndex === pageCount - 1} onClick={() => setPageIndex(index => Math.min(pageCount - 1, index + 1))}>
                  <CaretRightIcon size={17} aria-hidden="true" />
                </button>
              </nav>
          )}

          <div className={styles.modalActions}>
            <button
              className={styles.modalControlBtn}
              onClick={() => setIsFullscreen(value => !value)}
              type="button" aria-pressed={isFullscreen}
              aria-label={fullscreenLabel}
              title={fullscreenLabel}
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
              onClick={dismiss}
              data-evidence-close
              type="button" aria-label={closeLabel} title={closeLabel}
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
      </>}
    </EvidenceDialog>
  );
}
