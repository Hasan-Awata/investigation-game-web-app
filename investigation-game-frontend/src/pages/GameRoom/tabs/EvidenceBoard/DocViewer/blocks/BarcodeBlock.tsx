import type { DocBlock } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'barcode' }> };

/**
 * Decorative barcode via the 'Libre Barcode 39' face already loaded in
 * index.html. Ported from `.financial-barcode` (FinancialRecordViewer.css:90-98)
 * and `.telecom-barcode` (PhoneRecordsViewer.css:62-67).
 *
 * The surrounding asterisks are Libre Barcode 39 start/stop guards, matching
 * the legacy markup at BallisticsViewer.tsx:34.
 */
export default function BarcodeBlock({ block }: Props) {
  const { value } = block.props;
  if (!value) return null;

  return (
    <div
      className="db-barcode"
      style={block.style?.pad ? { padding: block.style.pad } : undefined}
    >
      {`*${value}*`}
    </div>
  );
}
