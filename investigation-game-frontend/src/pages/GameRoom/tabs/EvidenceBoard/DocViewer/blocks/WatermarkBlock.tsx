import type { DocBlock } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'watermark' }> };

/**
 * Large faded wordmark behind the flow content. Ported from
 * `.contract-watermark` (ContractViewer.css:46) and `.financial-watermark`
 * (FinancialRecordViewer.css:122-135).
 *
 * This is one of two blocks permitted `position: absolute` (see PlansEvidence.md
 * section 5.1) -- and only because BlockRenderer lifts it into the sheet's
 * dedicated overlay layer, so it is anchored to the sheet root and never
 * displaces flow content. That is what keeps the document reflowable.
 */
export default function WatermarkBlock({ block }: Props) {
  const { text, rotate = -30 } = block.props;
  if (!text) return null;

  return (
    <div className="db-watermark" aria-hidden="true">
      <span className="db-watermark-text" style={{ transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}>
        {text}
      </span>
    </div>
  );
}
