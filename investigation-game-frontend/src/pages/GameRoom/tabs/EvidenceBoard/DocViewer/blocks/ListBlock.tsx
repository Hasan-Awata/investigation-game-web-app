import type { DocBlock } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'list' }> };

/**
 * Plain or ordered list. Distilled from `.contract-parties-list`
 * (ContractViewer.tsx:57-60) and `.autopsy-evidence-list`
 * (AutopsyViewer.css:173-182).
 *
 * Items are plain strings by design: rich formatting goes through a `prose`
 * block, which is sanitized. Keeping this block string-only means a list can
 * never be an injection vector.
 */
export default function ListBlock({ block }: Props) {
  const { items, ordered = false } = block.props;
  if (!items || items.length === 0) return null;

  const Tag = ordered ? 'ol' : 'ul';

  return (
    <Tag className="db-list">
      {items.map((item, i) => (
        <li className="db-list-item" key={`${i}-${item.slice(0, 12)}`}>
          {item}
        </li>
      ))}
    </Tag>
  );
}
