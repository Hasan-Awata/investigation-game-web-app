import type { DocBlock, RuleVariant } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'rule' }> };

/**
 * Section divider. Replaces the ad-hoc borders that the legacy viewers
 * hand-rolled per document (pagination footers, section breaks).
 */
export default function RuleBlock({ block }: Props) {
  const { variant = 'solid' } = block.props;
  const safeVariant: RuleVariant =
    variant === 'dashed' || variant === 'dotted' || variant === 'double' ? variant : 'solid';

  return <div className={`db-rule db-rule--${safeVariant}`} />;
}
