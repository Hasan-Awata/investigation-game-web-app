import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { TerminalBlock, TerminalDocument } from '@/types/evidence/terminal';
import { ensureTerminalBlockIds } from '@/types/evidence/terminal';
import TerminalBlockRenderer from './TerminalBlockRenderer';
import './themes.css';
import './TerminalViewer.css';

interface TerminalSheetProps {
  doc: TerminalDocument;
  evidenceId: number;
  fluid?: boolean;
  cellWrapper?: (content: ReactNode, block: TerminalBlock) => ReactNode;
}

export default function TerminalSheet({
  doc,
  evidenceId,
  fluid = false,
  cellWrapper,
}: TerminalSheetProps) {
  const { t } = useTranslation();
  const blocks = useMemo(() => ensureTerminalBlockIds(doc.blocks ?? []), [doc.blocks]);

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
        <div className="terminal-sheet-body">
          {blocks.length > 0 ? (
            <TerminalBlockRenderer blocks={blocks} ctx={{ evidenceId }} cellWrapper={cellWrapper} />
          ) : (
            <p className="terminal-sheet-empty">{t('pages.gameRoom.evidence.viewers.terminal.emptySession')}</p>
          )}
        </div>
      </div>
    </article>
  );
}
