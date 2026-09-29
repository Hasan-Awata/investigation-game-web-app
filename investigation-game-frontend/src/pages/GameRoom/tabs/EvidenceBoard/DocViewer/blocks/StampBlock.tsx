import type { DocBlock, StampTone } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'stamp' }> };

/**
 * Rotated bordered stamp. Tones cover the four real stamps in the codebase:
 * - `official`      slate, per `.autopsy-stamp` (AutopsyViewer.css:232-244)
 * - `forged`        crimson "FRAUDULENT", per `.contract-validation-stamp`
 * - `confidential`  crimson rubber stamp, per `.financial-stamp` (FinancialRecordViewer.css:99-114)
 * - `crimson`       bare crimson
 *
 * Rotation is negated under RTL so the tilt mirrors rather than reverses.
 */
export default function StampBlock({ block }: Props) {
  const { text, tone = 'official' } = block.props;
  if (!text) return null;

  const safeTone: StampTone =
    tone === 'forged' || tone === 'confidential' || tone === 'crimson' ? tone : 'official';

  return <div className={`db-stamp db-stamp--${safeTone}`}>{text}</div>;
}
