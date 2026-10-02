import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { DocBlock, DocRenderContext } from '@/types/evidence/doc';
import { clampSpan } from '@/types/evidence/shared';
import { ensureBlockIds } from '@/types/evidence/doc';
import { getBlockComponent } from './blocks';
import './blocks.css';

interface BlockRendererProps {
  blocks: DocBlock[];
  ctx: DocRenderContext;
  /** Marks this as the sheet's top-level grid, which owns the column template. */
  isRoot?: boolean;
  /**
   * Wraps each block's content inside its own `.db-cell`.
   *
   * The Phase 3 admin canvas passes a wrapper that adds a selection outline and
   * a dnd-kit drag handle; the game passes nothing and gets a bare cell. The
   * seam exists so the builder renders the *same* grid, spans, and theme CSS as
   * the game rather than a lookalike -- a wrapper must not introduce any
   * positioning of its own, because `.db-cell` owns the flow contract.
   */
  cellWrapper?: (content: ReactNode, block: DocBlock) => ReactNode;
}

/**
 * Renders a block array as a 12-column CSS grid. Every block declares a `span`
 * (1-12); `two_column` re-enters this component for its nested columns, so the
 * same grid rhythm applies at every depth.
 *
 * Rows flow top to bottom. Nothing here is absolutely positioned -- the only
 * exception is the `watermark` overlay, which the viewer lifts out of the flow
 * before handing blocks down. See PlansEvidence.md section 5.1.
 */
export default function BlockRenderer({ blocks, ctx, isRoot = true, cellWrapper }: BlockRendererProps) {
  const prepared = useMemo(() => ensureBlockIds(blocks ?? []), [blocks]);

  if (prepared.length === 0) return null;

  return (
    <div className={isRoot ? 'db-grid' : 'db-grid db-grid--nested'}>
      {prepared.map((block) => {
        const Component = getBlockComponent(block.type);

        if (!Component) {
          // Unreachable for well-formed data; kept so one bad stored block
          // cannot blank an entire case file.
          console.warn(`Unknown doc block type: ${(block as DocBlock).type}`);
          return null;
        }

        const content = <Component block={block} ctx={ctx} />;

        return (
          <div
            className="db-cell"
            key={block.id}
            style={{ gridColumn: `span ${clampSpan(block.span)}` }}
          >
            {cellWrapper ? cellWrapper(content, block) : content}
          </div>
        );
      })}
    </div>
  );
}
