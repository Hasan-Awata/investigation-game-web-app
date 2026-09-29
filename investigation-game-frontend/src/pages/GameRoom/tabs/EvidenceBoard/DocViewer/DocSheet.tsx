import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { DocBlock, DocDocument } from '@/types/evidence/doc';
import { DEFAULT_PAGE, DOC_OVERLAY_BLOCK_TYPES, ensureBlockIds } from '@/types/evidence/doc';
import { getBlockComponent } from './blocks';
import BlockRenderer from './BlockRenderer';
import './themes.css';
import './UniversalDocViewer.css';

interface DocSheetProps {
  doc: DocDocument;
  evidenceId: number;
  /**
   * Drops the fixed 800x1131 stage so the sheet can sit in a fluid container.
   * Used by the admin authoring canvas (PlansEvidence.md section 3.3); the game
   * viewer always renders the fixed stage.
   */
  fluid?: boolean;
  /**
   * Applies `cellWrapper` to in-flow blocks. See BlockRenderer.
   */
  cellWrapper?: (content: ReactNode, block: DocBlock) => ReactNode;
  /**
   * Applies `cellWrapper` to overlay blocks too and drops `aria-hidden`, so the
   * admin builder can select and edit a watermark. The game leaves this off: an
   * overlay block is decorative there and must stay out of the a11y tree.
   */
  interactiveOverlay?: boolean;
}

const OVERLAY = new Set<string>(DOC_OVERLAY_BLOCK_TYPES);

/**
 * The A4 sheet: theme tokens, the watermark overlay, and the in-flow block grid.
 *
 * Split out of UniversalDocViewer so the Phase 3 admin canvas can render the
 * exact same sheet fluid-width, guaranteeing authoring preview and game output
 * cannot drift.
 *
 * Two invariants live here:
 *
 * 1. Overlay blocks are lifted out of the grid before rendering, so the grid
 *    only ever receives blocks that participate in normal flow. That is what
 *    lets a watermark be absolutely positioned without disturbing a single
 *    content row.
 * 2. Theme tokens own sheet padding. `page.pad` is honoured only when it
 *    differs from the default, so an author can widen the inset without a new
 *    theme, and no theme is silently flattened to 64px.
 */
export default function DocSheet({
  doc,
  evidenceId,
  fluid = false,
  cellWrapper,
  interactiveOverlay = false,
}: DocSheetProps) {
  const { overlayBlocks, flowBlocks } = useMemo(() => {
    const all = ensureBlockIds(doc.blocks ?? []);
    return {
      overlayBlocks: all.filter((b: DocBlock) => OVERLAY.has(b.type)),
      flowBlocks: all.filter((b: DocBlock) => !OVERLAY.has(b.type)),
    };
  }, [doc.blocks]);

  const sheetStyle = useMemo(() => {
    const base: React.CSSProperties = {
      '--doc-page-w': `${doc.page?.w ?? DEFAULT_PAGE.w}px`,
      '--doc-page-min-h': `${doc.page?.minH ?? DEFAULT_PAGE.minH}px`,
    } as React.CSSProperties;

    const pad = doc.page?.pad;
    if (pad !== undefined && pad !== DEFAULT_PAGE.pad) {
      (base as Record<string, string>)['--doc-pad-y'] = `${pad}px`;
      (base as Record<string, string>)['--doc-pad-x'] = `${pad}px`;
    }
    return base;
  }, [doc.page]);

  const Watermark = getBlockComponent('watermark');

  return (
    <article
      className={`doc-sheet${fluid ? ' doc-sheet--fluid' : ''}`}
      data-theme={doc.theme}
      style={sheetStyle}
    >
      {overlayBlocks.length > 0 && (
        <div className="doc-sheet-overlay" aria-hidden={interactiveOverlay ? undefined : true}>
          {overlayBlocks.map((b) => {
            const content = <Watermark key={b.id} block={b as never} ctx={{ evidenceId }} />;
            return cellWrapper && interactiveOverlay ? cellWrapper(content, b) : content;
          })}
        </div>
      )}

      <div className="doc-sheet-body">
        {flowBlocks.length > 0 ? (
          <BlockRenderer blocks={flowBlocks} ctx={{ evidenceId }} cellWrapper={cellWrapper} />
        ) : (
          <p className="doc-sheet-empty">Document contents illegible or corrupted.</p>
        )}
      </div>
    </article>
  );
}
