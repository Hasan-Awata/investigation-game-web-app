import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './HashMatrixBlock.css';

export default function HashMatrixBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'hash_matrix')) return null;
  const { rows, algorithm } = block.props;

  return (
    <div className="tb-hash-matrix">
      <div className="tb-hash-matrix__header">
        <span className="tb-hash-matrix__algorithm">{algorithm.toUpperCase()}</span>
        <span className="tb-hash-matrix__cols">OFFSET  00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F  ASCII</span>
      </div>
      <div className="tb-hash-matrix__rows">
        {rows.map((row, i) => (
          <div key={i} className="tb-hash-matrix__row">
            <span className="tb-hash-matrix__offset">{row.offset}</span>
            <span className="tb-hash-matrix__bytes">{row.bytes.join(' ')}</span>
            <span className="tb-hash-matrix__ascii">{row.ascii}</span>
          </div>
        ))}
      </div>
    </div>
  );
}