import type { DocBlock, DocRenderContext } from '@/types/evidence/doc';
import BlockRenderer from '../BlockRenderer';
import '../blocks.css';

type Props = {
  block: Extract<DocBlock, { type: 'two_column' }>;
  ctx: DocRenderContext;
};

/**
 * Two-column container. Distilled from `.autopsy-body-section`
 * (AutopsyViewer.css:106-111), which paired a data column against a diagram.
 *
 * Columns hold nested blocks, so this re-enters BlockRenderer. Nesting depth is
 * therefore not artificially capped -- a `two_column` inside a `two_column` works
 * if an author ever needs it. The 12-column grid keeps both halves aligned with
 * the sheet's outer rhythm.
 */
export default function TwoColumnBlock({ block, ctx }: Props) {
  const { left = [], right = [], gap = 32, rightWidth } = block.props;
  if (left.length === 0 && right.length === 0) return null;

  const gridStyle: React.CSSProperties = rightWidth
    ? { gridTemplateColumns: `1fr ${rightWidth}px`, gap }
    : { gridTemplateColumns: '1fr 1fr', gap };

  return (
    <div className="db-two-col" style={gridStyle}>
      <div className="db-two-col-cell db-two-col-cell--lead">
        <BlockRenderer blocks={left} ctx={ctx} isRoot={false} />
      </div>
      <div className="db-two-col-cell db-two-col-cell--trail">
        <BlockRenderer blocks={right} ctx={ctx} isRoot={false} />
      </div>
    </div>
  );
}
