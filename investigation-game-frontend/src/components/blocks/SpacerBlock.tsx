import type { SpacerBlock } from '@/types/evidence/shared';

/** Vertical breathing room. The only purely presentational block. */
export default function SpacerBlock({ block }: { block: SpacerBlock }) {
  const raw = Number(block.props.height);
  const height = Number.isFinite(raw) ? Math.min(400, Math.max(0, raw)) : 16;
  return <div className="block-spacer" style={{ height }} />;
}