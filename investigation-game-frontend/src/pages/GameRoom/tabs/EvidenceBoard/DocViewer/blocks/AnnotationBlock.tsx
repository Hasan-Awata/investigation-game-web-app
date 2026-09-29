import type { DocBlock } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'annotation' }> };

/**
 * Handwritten investigator's scrawl. Ported from
 * `.handwritten-note-overlay` (BallisticsViewer.tsx:124-128) and the sticky-note
 * treatment in MemoViewer.css:116-182.
 *
 * Rendered inline in the flow, not floated -- an annotation belongs to a
 * position in the document, so it must push content rather than overlap it.
 */
export default function AnnotationBlock({ block }: Props) {
  const { text, rotate = -3 } = block.props;
  if (!text) return null;

  return (
    <div
      className="db-annotation"
      style={block.style?.pad ? { padding: block.style.pad } : undefined}
    >
      <span className="db-annotation-text" style={{ transform: `rotate(${rotate}deg)` }}>
        {text}
      </span>
    </div>
  );
}
