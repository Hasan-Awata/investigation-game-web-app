import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EvidenceBoardEntry } from '@/types';
import {
  asPagedDocument,
  isModel3dArtifactPayload,
  type EvidenceDetailEntry,
} from '@/types/evidence';
import { fetchEvidenceDetail } from '@/services/api';
import { useRoomData } from '@/context/RoomContext';
import { ArtifactViewer, MediaViewer, PaperViewer, TerminalViewer } from './Viewers';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EvidenceContext } from './EvidenceContext';
import styles from './EvidenceModal.module.css';

interface EvidenceModalProps {
  /** The board row that was clicked. Only enough to identify and title the file. */
  evidence: EvidenceBoardEntry | null;
  onClose: () => void;
}

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: EvidenceDetailEntry };

/**
 * A loaded document, tagged with the evidence it belongs to.
 *
 * Tagging is what keeps one file's payload from being rendered under the next
 * file's heading: the render path compares the tag rather than clearing state
 * in an effect, so there is no frame where the previous body is still on screen.
 */
type LoadedDetail = { evidenceId: number; state: DetailState };

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  const { t } = useTranslation();
  const { room } = useRoomData();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState<LoadedDetail | null>(null);

  const evidenceId = evidence?.id ?? null;

  // The board row carries no content, so the body is requested on open. Closing
  // the modal unmounts the body, and a request that lands after the id changed is
  // discarded rather than shown against the wrong file.
  useEffect(() => {
    if (evidenceId === null) {
      return;
    }

    let cancelled = false;

    fetchEvidenceDetail(room.id, evidenceId).then((result) => {
      if (cancelled) return;

      setLoaded({
        evidenceId,
        state: result.isSuccess
          ? { status: 'ready', detail: result.value }
          : { status: 'error', message: result.errorMessage },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [evidenceId, room.id]);

  if (!evidence) return null;

  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const handleClose = () => {
    setIsFullscreen(false);
    onClose();
  };

  // A tag mismatch means this file has not arrived yet, which reads as loading
  // rather than as an error.
  const detail: DetailState = loaded?.evidenceId === evidenceId ? loaded.state : { status: 'loading' };

  const renderBody = () => {
    if (detail.status === 'loading') {
      return (
        <div className={styles.modalStatus}>
          {t('pages.gameRoom.evidence.viewers.loading', 'Opening file...')}
        </div>
      );
    }

    if (detail.status === 'error') {
      return (
        <div className={styles.modalStatus}>
          {detail.message}
        </div>
      );
    }

    const { detail: entry } = detail;

    // The strategy decides the viewer, and it is the server's call: a file is
    // never rendered as a medium it was not stored as. Each case hands the
    // viewer only the variant it can display, so a mismatch is a compile error
    // rather than a rendering bug.
    switch (entry.viewer_strategy) {
      case 'paper': {
        const paged = asPagedDocument(entry);

        if (paged === null) {
          return (
            <div className={styles.modalStatus}>
              {t('pages.gameRoom.evidence.viewers.malformed', 'This file could not be read.')}
            </div>
          );
        }

        return <PaperViewer evidence={entry} pages={paged.pages} />;
      }

      case 'terminal': {
        const paged = asPagedDocument(entry);

        if (paged === null) {
          return (
            <div className={styles.modalStatus}>
              {t('pages.gameRoom.evidence.viewers.malformed', 'This file could not be read.')}
            </div>
          );
        }

        return <TerminalViewer evidence={entry} pages={paged.pages} />;
      }

      case 'media':
        return <MediaViewer evidence={entry} />;

      case 'artifact':
        // A 3D artifact has no viewer this pass; the backend gate is off, so this
        // only renders for a row that already carries a model asset.
        if (isModel3dArtifactPayload(entry.content_payload)) {
          return (
            <div className={styles.modalStatus}>
              {t('pages.gameRoom.evidence.viewers.artifact.modelDisabled', '3D artifacts are not enabled.')}
            </div>
          );
        }

        return <ArtifactViewer evidence={entry} />;
    }
  };

  return (
    <div className={styles.evidenceModalOverlay} onClick={handleClose}>
      <div
        className={`${styles.evidenceModalContent} glass-panel ${isFullscreen ? styles.fullscreenModal : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div className={styles.modalMeta}>
            <span className={styles.evidenceTypeBadge}>{evidence.evidence_type}</span>
            {evidence.title && <span className={styles.modalTitle}>{evidence.title}</span>}
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.modalFullscreenBtn}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Minimize' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                </svg>
              )}
            </button>

            <button
              className={styles.modalCloseBtn}
              onClick={handleClose}
              title="Close File"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.modalBody}>
          <ErrorBoundary
            isLocal={true}
            fallbackMessage={`Evidence file EX-${evidence.id.toString().padStart(3, '0')} is corrupted or malformed. Asset viewing aborted.`}
          >
            <EvidenceContext.Provider value={{ isFullscreen }}>
              {renderBody()}
            </EvidenceContext.Provider>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
