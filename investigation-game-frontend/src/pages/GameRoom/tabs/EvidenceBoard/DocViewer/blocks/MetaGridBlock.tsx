import type { DocBlock, MetaGridTone } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'meta_grid' }> };

/**
 * Label/value pairs laid out in a responsive grid.
 *
 * Tones, all lifted from existing viewers:
 * - `rows`   dotted-underlined rows, per `.autopsy-data-row` (AutopsyViewer.css:119-124)
 * - `boxed`  bordered enclosure, per `.autopsy-meta-box` (AutopsyViewer.css:89-99)
 * - `plain`  bare stacked pairs, per `.telecom-subscriber-details` (PhoneRecordsViewer.css:77-82)
 */
export default function MetaGridBlock({ block }: Props) {
  const { rows, columns = 1, tone = 'rows' } = block.props;
  if (!rows || rows.length === 0) return null;

  const cols = Math.min(4, Math.max(1, Math.floor(columns) || 1));
  const safeTone: MetaGridTone = tone === 'boxed' || tone === 'plain' ? tone : 'rows';

  return (
    <div
      className={`db-meta-grid db-meta-grid--${safeTone} db-meta-grid--cols-${cols}`}
      style={block.style?.pad ? { padding: block.style.pad } : undefined}
    >
      {rows.map((row, i) => (
        <div className="db-meta-pair" key={`${row.label}-${i}`}>
          <span className="db-meta-label">{row.label}</span>
          <span className="db-meta-value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
