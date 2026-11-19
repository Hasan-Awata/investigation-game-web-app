import type { ReactNode } from 'react';
import { useEvidenceContext } from '../EvidenceContext';
import { useViewerInteraction } from './useViewerInteraction';
import styles from './ViewersContainer.module.css';

interface ViewersContainerProps { children: ReactNode; pageIndex?: number }

export default function ViewersContainer({ children, pageIndex }: ViewersContainerProps) {
  const { isFullscreen } = useEvidenceContext();
  const { viewportRef, contentRef, stageRef } = useViewerInteraction(isFullscreen, pageIndex);
  return (
    <div className={`${styles['viewers-container-wrapper']} ${isFullscreen ? styles['fullscreen-mode'] : ''}`}>
      <div ref={viewportRef} className={`${styles['viewers-zoom-overlay']} ${isFullscreen ? styles['zoom-enabled'] : styles['native-scroll']}`}>
        <div ref={stageRef} className={styles['viewers-stage']}>
          <div ref={contentRef} className={`${styles['viewers-content-area']} ${isFullscreen ? styles['fullscreen-scaled'] : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
