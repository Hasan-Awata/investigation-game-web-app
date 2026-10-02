import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './PacketTraceBlock.css';

export default function PacketTraceBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'packet_trace')) return null;
  const { rows } = block.props;

  return (
    <div className="tb-packet-trace">
      <table className="tb-packet-trace__table">
        <thead>
          <tr>
            <th>SRC</th>
            <th>DST</th>
            <th>PROTO</th>
            <th>BYTES</th>
            <th>STATE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.src}</td>
              <td>{row.dst}</td>
              <td>{row.proto}</td>
              <td>{row.bytes}</td>
              <td><span className={`tb-packet-trace__state tb-packet-trace__state--${row.state.toLowerCase()}`}>{row.state}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}