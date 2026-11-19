import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import Folder from '@/components/react-bits/Folder';
import type { DocEvidence } from '@/types/evidence';
import TemplateRenderer, { PAPER_HEIGHT, PAPER_WIDTH } from '@/features/evidence/presentation/TemplateRenderer';
import { readTemplate } from '@/features/evidence/presentation/catalog';
import styles from './DocumentEvidence.module.css';

const MAX_PREVIEW_PAGES = 3;

export default function DocumentEvidence({ evidence }: { evidence: DocEvidence }) {
  const template = readTemplate(evidence.metadata);
  const firstPreview = useRef<HTMLDivElement>(null);
  const firstSheet = useRef<HTMLDivElement>(null);
  const [{ count, scale }, setPreview] = useState({ count: 1, scale: 0 });

  useLayoutEffect(() => {
    const preview = firstPreview.current;
    const sheet = firstSheet.current;
    if (!preview || !sheet) return;

    const measure = () => {
      const count = Math.max(1, Math.min(MAX_PREVIEW_PAGES, Math.ceil(sheet.scrollHeight / PAPER_HEIGHT)));
      const { width, height } = getComputedStyle(preview);
      const scale = Math.min((Number.parseFloat(width) || 0) / PAPER_WIDTH, (Number.parseFloat(height) || 0) / PAPER_HEIGHT);
      setPreview(previous => previous.count === count && previous.scale === scale ? previous : { count, scale });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(preview);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  return (
    <Folder
      color="#e8d5b7"
      variant="matte"
      paperAspectRatio={PAPER_WIDTH / PAPER_HEIGHT}
      peekLift={14}
      followPointer={false}
      decorative
      open={false}
      draggable={false}
      intro={false}
      cover={
        <div className={styles.cover}>
          <h4 dir="auto" className={styles.title}>{evidence.title}</h4>
          {evidence.description && <p dir="auto" className={styles.description}>{evidence.description}</p>}
        </div>
      }
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} ref={index === 0 ? firstPreview : undefined} className={styles.preview} inert>
          <div
            className={styles.slice}
            style={{
              width: PAPER_WIDTH,
              height: PAPER_HEIGHT,
              visibility: scale > 0 ? undefined : 'hidden',
              '--preview-scale': scale,
            } as CSSProperties}
          >
            <div className={styles.sheet} style={{ top: -index * PAPER_HEIGHT }}>
              <div ref={index === 0 ? firstSheet : undefined}>
                <ErrorBoundary key={evidence.updated_at} fallback={null}>
                  <TemplateRenderer template={template} pageLimit={MAX_PREVIEW_PAGES} />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      ))}
    </Folder>
  );
}
