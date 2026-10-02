import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './OutputStreamBlock.css';

export default function OutputStreamBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'output_stream')) return null;
  const { lines, tone = 'stdout', label } = block.props;

  return (
    <div className={`tb-output-stream tb-tone-${tone}`}>
      {label && <div className="tb-output-stream__label">{label}</div>}
      <div className="tb-output-stream__lines">
        {lines.map((line, i) => (
          <div key={i} className="tb-output-stream__line">{line}</div>
        ))}
      </div>
    </div>
  );
}