import type { DocBlock } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'spacer' }> };

/** Vertical breathing room. The only purely presentational block. */
export default function SpacerBlock({ block }: Props) {
  const raw = Number(block.props.height);
  const height = Number.isFinite(raw) ? Math.min(400, Math.max(0, raw)) : 16;
  return <div className="db-spacer" style={{ height }} />;
}
