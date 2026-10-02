import type { Evidence, DigitalEvidence } from '@/types/evidence';
import { isDigitalEvidence } from '@/types/evidence';
import './DigitalEvidence.css';

export default function DigitalEvidence({ evidence }: { evidence: Evidence }) {
  if (!isDigitalEvidence(evidence)) return null;
  const terminalTheme = evidence.metadata.terminal?.theme ?? 'terminal';

  return (
    <div className="digital-variant terminal-card terminal-window" data-theme={terminalTheme}>
      <div className="terminal-card__chrome" aria-hidden="true">
        <div className="terminal-card__controls">
          <span className="terminal-card__control terminal-card__control--close" />
          <span className="terminal-card__control terminal-card__control--minimize" />
          <span className="terminal-card__control terminal-card__control--maximize" />
        </div>
        <span className="terminal-card__title">{terminalTheme}</span>
      </div>

      <div className="terminal-card__body">
        <div className="terminal-card__prompt">
          <span className="terminal-card__prompt-user">investigator</span>
          <span className="terminal-card__prompt-at">@</span>
          <span className="terminal-card__prompt-host">evidence-board</span>
          <span className="terminal-card__prompt-dir">:~</span>
          <span className="terminal-card__prompt-char">$</span>
        </div>
        <h4 className="terminal-card__evidence-title">{evidence.title}</h4>
        {evidence.description && <p className="terminal-card__evidence-desc">{evidence.description}</p>}
      </div>
    </div>
  );
}