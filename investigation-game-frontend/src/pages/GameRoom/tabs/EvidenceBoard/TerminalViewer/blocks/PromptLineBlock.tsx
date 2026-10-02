import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './PromptLineBlock.css';

export default function PromptLineBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'prompt_line')) return null;
  const { prompt, command, output, tone = 'stdout' } = block.props;

  return (
    <div className={`tb-prompt-line tb-tone-${tone}`}>
      <div className="tb-prompt-line__header">
        <span className="tb-prompt">{prompt}</span>
        <span className="tb-command">{command}</span>
      </div>
      {output.length > 0 && (
        <div className="tb-prompt-line__output">
          {output.map((line, i) => (
            <div key={i} className="tb-prompt-line__output-line">{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}