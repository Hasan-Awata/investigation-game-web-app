import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import Folder from '@/components/react-bits/Folder';
import { normalizeDoc, type DocEvidence } from '@/types/evidence';
import DocSheet from '../DocViewer/DocSheet';
import TemplateRenderer, { PAPER_HEIGHT, PAPER_WIDTH } from '@/features/evidence/presentation/TemplateRenderer';
import { readTemplate } from '@/features/evidence/presentation/catalog';
import styles from './DocumentEvidence.module.css';

const MAX_PREVIEW_PAGES = 3;

export default function DocumentEvidence({ evidence }: { evidence: DocEvidence }) {
  const doc = useMemo(() => normalizeDoc(evidence.metadata), [evidence.metadata]);
  const hasTemplate = Boolean(evidence.metadata && typeof evidence.metadata === 'object' && 'template' in evidence.metadata);
  const pageWidth = hasTemplate ? PAPER_WIDTH : doc.page.w;
  const pageHeight = hasTemplate ? PAPER_HEIGHT : doc.page.minH;
  const firstPreview = useRef<HTMLDivElement>(null);
  const firstSheet = useRef<HTMLElement>(null);
  const [{ count, scale }, setPreview] = useState({ count: 1, scale: 0 });

  useLayoutEffect(() => {
    const preview = firstPreview.current;
    const sheet = firstSheet.current;
    if (!preview || !sheet) return;

    const measure = () => {
      // The viewer uses one continuous sheet. Each thumbnail shows one page-height slice.
      const bottomPadding = Number.parseFloat(getComputedStyle(sheet).paddingBottom) || 0;
      const contentHeight = sheet.scrollHeight - bottomPadding;
      const count = Math.max(1, Math.min(MAX_PREVIEW_PAGES, Math.ceil(contentHeight / pageHeight)));
      const { width, height } = getComputedStyle(preview);
      const scale = Math.min((Number.parseFloat(width) || 0) / pageWidth, (Number.parseFloat(height) || 0) / pageHeight);
      setPreview(previous => previous.count === count && previous.scale === scale ? previous : { count, scale });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(preview);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [doc, hasTemplate, pageWidth, pageHeight]);

  return (
    <Folder
      color="#e8d5b7"
      variant="matte"
      paperAspectRatio={pageWidth / pageHeight}
      peekLift={14}
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
              width: pageWidth,
              height: pageHeight,
              visibility: scale > 0 ? undefined : 'hidden',
              '--preview-scale': scale,
            } as CSSProperties}
          >
            <div className={styles.sheet} style={{ top: -index * pageHeight }}>
              <ErrorBoundary key={evidence.updated_at} fallback={null}>
                {hasTemplate
                  ? <div ref={index === 0 ? node => { firstSheet.current = node; } : undefined}><TemplateRenderer template={readTemplate(evidence.metadata)} pageLimit={MAX_PREVIEW_PAGES} /></div>
                  : <DocSheet doc={doc} evidenceId={evidence.id} sheetRef={index === 0 ? firstSheet : undefined} />}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      ))}
    </Folder>
  );
}
