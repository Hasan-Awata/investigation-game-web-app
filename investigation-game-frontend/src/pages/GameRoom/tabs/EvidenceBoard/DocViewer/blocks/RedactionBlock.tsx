import type { DocBlock } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'redaction' }> };

/**
 * Region-level redaction: one or more opaque bars with an optional authority
 * caption.
 *
 * Distinct from the inline `.redacted` span (themes.css, inherited from
 * BackgroundCheckViewer.css:134-141), which redacts a few words inside prose.
 * This block redacts a whole region, e.g. a withheld witness name or an
 * expunged address block.
 */
export default function RedactionBlock({ block }: Props) {
  const rawLines = Number(block.props.lines);
  const lines = Number.isFinite(rawLines) ? Math.min(12, Math.max(1, Math.round(rawLines))) : 1;
  const { label } = block.props;

  return (
    <div
      className="db-redaction"
      style={block.style?.pad ? { padding: block.style.pad } : undefined}
    >
      <div className="db-redaction-bars" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div
            className="db-redaction-bar"
            key={i}
            style={{ width: `${[100, 86, 94, 72][i % 4]}%` }}
          />
        ))}
      </div>
      {label && <div className="db-redaction-label">{label}</div>}
    </div>
  );
}
