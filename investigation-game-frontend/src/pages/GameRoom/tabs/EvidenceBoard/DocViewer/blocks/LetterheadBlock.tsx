import type { DocBlock } from '@/types/evidence/doc';

type Props = { block: Extract<DocBlock, { type: 'letterhead' }> };

/**
 * Agency / title / sub masthead, with an optional boxed aside on the trailing
 * edge. Distilled from `.ballistics-header` (BallisticsViewer.css:43-61) and
 * `.autopsy-header` (AutopsyViewer.css:42-99).
 */
export default function LetterheadBlock({ block }: Props) {
  const { agency, title, sub, aside, asideLabel, rule = true } = block.props;
  if (!agency && !title && !sub && !aside) return null;

  return (
    <header className="db-letterhead">
      <div className="db-letterhead-main">
        {agency && <div className="db-letterhead-agency">{agency}</div>}
        {title && <h2 className="db-letterhead-title">{title}</h2>}
        {sub && <div className="db-letterhead-sub">{sub}</div>}
      </div>

      {aside && (
        <div className="db-letterhead-aside">
          {asideLabel && <span className="db-letterhead-aside-label">{asideLabel}</span>}
          <span className="db-letterhead-aside-value">{aside}</span>
        </div>
      )}

      {rule && <div className="db-letterhead-rule" />}
    </header>
  );
}
