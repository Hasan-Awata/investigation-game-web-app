import type { Evidence, DigitalEvidence } from '@/types/evidence';
import { isDigitalEvidence } from '@/types/evidence';
import digitalEvidence from './DigitalEvidence.module.css';

export default function DigitalEvidence({ evidence }: { evidence: Evidence }) {
  if (!isDigitalEvidence(evidence)) return null;
  const terminalTheme = evidence.metadata.terminal?.theme ?? 'terminal';

  return (
    <div className={`${digitalEvidence['digital-variant']} ${digitalEvidence['terminal-card']} terminal-window`} data-theme={terminalTheme}>
      <div className={digitalEvidence['terminal-card__chrome']} aria-hidden="true">
        <div className={digitalEvidence['terminal-card__controls']}>
          <span className={`${digitalEvidence['terminal-card__control']} ${digitalEvidence['terminal-card__control--close']}`} />
          <span className={`${digitalEvidence['terminal-card__control']} ${digitalEvidence['terminal-card__control--minimize']}`} />
          <span className={`${digitalEvidence['terminal-card__control']} ${digitalEvidence['terminal-card__control--maximize']}`} />
        </div>
        <span className={digitalEvidence['terminal-card__title']}>{terminalTheme}</span>
      </div>

      <div className={digitalEvidence['terminal-card__body']}>
        <div className={digitalEvidence['terminal-card__prompt']}>
          <span className={digitalEvidence['terminal-card__prompt-user']}>investigator</span>
          <span className={digitalEvidence['terminal-card__prompt-at']}>@</span>
          <span className={digitalEvidence['terminal-card__prompt-host']}>evidence-board</span>
          <span className={digitalEvidence['terminal-card__prompt-dir']}>:~</span>
          <span className={digitalEvidence['terminal-card__prompt-char']}>$</span>
        </div>
        <h4 className={digitalEvidence['terminal-card__evidence-title']}>{evidence.title}</h4>
        {evidence.description && <p className={digitalEvidence['terminal-card__evidence-desc']}>{evidence.description}</p>}
      </div>
    </div>
  );
}