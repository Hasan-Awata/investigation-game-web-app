import { useState } from 'react';
import type { Evidence } from '@/types/evidence';
import UniversalViewer from './Viewers/UniversalViewer';
import MediaViewer from './Viewers/MediaViewer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EvidenceContext } from './EvidenceContext';
import styles from './EvidenceModal.module.css';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
}

export default function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!evidence) return null;

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Explicitly reset fullscreen state before closing
  const handleClose = () => {
    setIsFullscreen(false);
    onClose();
  };

  const renderEvidenceContent = () => {
  if (evidence.evidence_type === 'image' || evidence.evidence_type === 'audio') {
    return <MediaViewer evidence={evidence} />;
  }
  
  return <UniversalViewer evidence={evidence} />;
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
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.modalFullscreenBtn}
              onClick={toggleFullscreen}
              title={isFullscreen ? "Minimize" : "Fullscreen"}
            >
              {isFullscreen ? (
                // Inward pointing arrows (Minimize)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20"></polyline>
                  <polyline points="20 10 14 10 14 4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              ) : (
                // Outward pointing arrows (Maximize)
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