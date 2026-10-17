import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TerminalBlock } from '@/types/evidence/terminal';
import { clampTerminalSpan } from '@/types/evidence/terminal';
import { getBlockComponent } from './blocks/blocks.registry';
import './blocks.css';

interface TerminalBlockRendererProps {
  blocks: TerminalBlock[];
  ctx: { evidenceId: number };
  cellWrapper?: (content: ReactNode, block: TerminalBlock) => ReactNode;
}

export default function TerminalBlockRenderer({ blocks, ctx, cellWrapper }: TerminalBlockRendererProps) {
  const { t } = useTranslation();
  return (
    <div className="tb-grid" role="list" aria-label="Terminal session">
      {blocks.map((block) => {
        const Comp = block.type === 'unsupported' ? undefined : getBlockComponent(block.type);
        const span = clampTerminalSpan(block.span);
        const align = block.style?.align ?? 'start';
        const pad = block.style?.pad ?? 0;

        const cellStyle: React.CSSProperties = {
          gridColumn: `span ${span}`,
          justifySelf: align,
          paddingInline: pad,
        };

        const cellContent = Comp
          ? <Comp key={block.id} block={block} ctx={ctx} />
          : <div className="tb-unsupported">{t('pages.gameRoom.evidence.viewers.terminal.unsupportedBlock', { type: block.type === 'unsupported' ? block.props.originalType : block.type })}</div>;

        const wrapped = cellWrapper ? cellWrapper(cellContent, block) : cellContent;

        return (
          <div key={block.id} className="tb-cell" style={cellStyle} role="listitem">
            {wrapped}
          </div>
        );
      })}
    </div>
  );
}
