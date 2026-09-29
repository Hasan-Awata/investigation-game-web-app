import type { DocBlock, DocRenderContext } from '@/types/evidence/doc';
import { signatureIndices, signatureUrl } from './signatureAsset';

type Props = {
  block: Extract<DocBlock, { type: 'signature_row' }>;
  ctx: DocRenderContext;
};

/**
 * Handwritten signature faces over ruled lines. Distilled from
 * `.contract-signature-block` (ContractViewer.css) and `.ballistics-sign-off`
 * (BallisticsViewer.tsx:109-122).
 *
 * The faces are procedural: indices are derived from the evidence id, matching
 * the legacy behaviour. See ./signatureAsset.ts.
 */
export default function SignatureRowBlock({ block, ctx }: Props) {
  const { columns = [] } = block.props;
  if (columns.length === 0) return null;

  const indices = signatureIndices(ctx.evidenceId, columns.length);

  return (
    <div
      className="db-signature-row"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((col, i) => (
        <div className="db-signature-col" key={`${col.caption}-${i}`}>
          <img
            src={signatureUrl(indices[i] ?? 0)}
            alt=""
            className="db-signature-img"
            draggable={false}
          />
          <div className="db-signature-line" />
          <span className="db-signature-caption">{col.caption}</span>
        </div>
      ))}
    </div>
  );
}
