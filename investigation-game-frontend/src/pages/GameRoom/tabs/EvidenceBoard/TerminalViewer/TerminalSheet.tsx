import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { TerminalBlock, TerminalDocument } from '@/types/evidence/terminal';
import { TERMINAL_OVERLAY_BLOCK_TYPES, ensureTerminalBlockIds } from '@/types/evidence/terminal';
import { getBlockComponent } from './blocks';
import TerminalBlockRenderer from './TerminalBlockRenderer';
import './themes.css';
import './TerminalViewer.css';

interface TerminalSheetProps {
  doc: TerminalDocument;
  evidenceId: number;
  fluid?: boolean;
  cellWrapper?: (content: ReactNode, block: TerminalBlock) => ReactNode;
  interactiveOverlay?: boolean;
}

const OVERLAY = new Set<string>(TERMINAL_OVERLAY_BLOCK_TYPES);

export default function TerminalSheet({
  doc,
  evidenceId,
  fluid = false,
  cellWrapper,
  interactiveOverlay = false,
}: TerminalSheetProps) {
  const { overlayBlocks, flowBlocks } = useMemo(() => {
    const all = ensureTerminalBlockIds(doc.blocks ?? []);
    return {
      overlayBlocks: all.filter((b: TerminalBlock) => OVERLAY.has(b.type)),
      flowBlocks: all.filter((b: TerminalBlock) => !OVERLAY.has(b.type)),
    };
  }, [doc.blocks]);

  return (
    <article
      className={`terminal-window terminal-sheet${fluid ? ' terminal-sheet--fluid' : ''}`}
      data-theme={doc.theme}
    >
      <div className="terminal-window__chrome" aria-hidden="true">
        <div className="terminal-window__controls">
          <span className="terminal-window__control terminal-window__control--close" />
          <span className="terminal-window__control terminal-window__control--minimize" />
          <span className="terminal-window__control terminal-window__control--maximize" />
        </div>
        <span className="terminal-window__title">{doc.theme}</span>
      </div>

      <div className="terminal-window__body">
        {overlayBlocks.length > 0 && (
          <div className="terminal-sheet-overlay" aria-hidden={interactiveOverlay ? undefined : true}>
            {overlayBlocks.map((b) => {
              const Comp = getBlockComponent(b.type);
              const content = <Comp key={b.id} block={b} ctx={{ evidenceId }} />;
              return cellWrapper && interactiveOverlay ? cellWrapper(content, b) : content;
            })}
          </div>
        )}

        <div className="terminal-sheet-body">
          {flowBlocks.length > 0 ? (
            <TerminalBlockRenderer blocks={flowBlocks} ctx={{ evidenceId }} cellWrapper={cellWrapper} />
          ) : (
            <p className="terminal-sheet-empty">Terminal session empty or corrupted.</p>
          )}
        </div>
      </div>
    </article>
  );
}