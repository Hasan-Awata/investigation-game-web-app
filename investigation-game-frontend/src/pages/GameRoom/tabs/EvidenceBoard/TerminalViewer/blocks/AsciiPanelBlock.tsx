import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './AsciiPanelBlock.css';

export default function AsciiPanelBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'ascii_panel')) return null;
  const { lines, caption, frame = 'box' } = block.props;

  const frameChars = {
    box: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    heavy: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
  }[frame];

  const maxLen = Math.max(...lines.map(l => l.length), caption?.length ?? 0);
  const paddedLines = lines.map(l => l.padEnd(maxLen));

  if (frame === 'none') {
    return (
      <div className="tb-ascii-panel tb-frame-none">
        <pre className="tb-ascii-panel__pre">{paddedLines.join('\n')}</pre>
        {caption && <div className="tb-ascii-panel__caption">{caption}</div>}
      </div>
    );
  }

  const top = frameChars.tl + frameChars.h.repeat(maxLen + 2) + frameChars.tr;
  const bottom = frameChars.bl + frameChars.h.repeat(maxLen + 2) + frameChars.br;
  const middle = paddedLines.map(l => frameChars.v + ' ' + l + ' ' + frameChars.v).join('\n');

  return (
    <div className={`tb-ascii-panel tb-frame-${frame}`}>
      <pre className="tb-ascii-panel__pre">
        {top}
        {middle}
        {bottom}
      </pre>
      {caption && <div className="tb-ascii-panel__caption">{caption}</div>}
    </div>
  );
}