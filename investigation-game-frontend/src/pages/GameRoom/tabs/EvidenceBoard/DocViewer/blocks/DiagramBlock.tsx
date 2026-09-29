import type { DocBlock, DocRenderContext } from '@/types/evidence/doc';
import DiagramShape from './DiagramShape';

type Props = {
  block: Extract<DocBlock, { type: 'diagram' }>;
  ctx: DocRenderContext;
};

/**
 * Framed forensic diagram. Distilled from `.autopsy-diagram-col`
 * (AutopsyViewer.css:184-215), which boxed the SVG and captioned it.
 *
 * `ctx` reaches `DiagramShape` so the data presets (electropherogram,
 * mass_spec) can seed themselves from the evidence id.
 */
export default function DiagramBlock({ block, ctx }: Props) {
  const { preset, caption } = block.props;

  return (
    <figure
      className="db-diagram"
      style={block.style?.pad ? { padding: block.style.pad } : undefined}
    >
      <div className="db-diagram-frame">
        <DiagramShape preset={preset} ctx={ctx} />
      </div>
      {caption && <figcaption className="db-diagram-caption">{caption}</figcaption>}
    </figure>
  );
}
