import type { ReactNode } from 'react';
import type { TerminalBlock } from '@/types/evidence/terminal';
import { clampTerminalSpan } from '@/types/evidence/terminal';
import { getBlockComponent } from './blocks';
import './blocks.css';

interface TerminalBlockRendererProps {
  blocks: TerminalBlock[];
  ctx: { evidenceId: number };
  cellWrapper?: (content: ReactNode, block: TerminalBlock) => ReactNode;
}

export default function TerminalBlockRenderer({ blocks, ctx, cellWrapper }: TerminalBlockRendererProps) {
  return (
    <div className="tb-grid" role="list" aria-label="Terminal session">
      {blocks.map((block) => {
        const Comp = getBlockComponent(block.type);
        const span = clampTerminalSpan(block.span);
        const align = block.style?.align ?? 'start';
        const pad = block.style?.pad ?? 0;

        const cellStyle: React.CSSProperties = {
          gridColumn: `span ${span}`,
          justifySelf: align,
          paddingInline: pad,
        };

        const cellContent = (
          <Comp key={block.id} block={block} ctx={ctx} />
        );

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