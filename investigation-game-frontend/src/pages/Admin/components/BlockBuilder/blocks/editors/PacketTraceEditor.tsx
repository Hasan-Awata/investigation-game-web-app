import type { TerminalBlock, PacketTraceProps, PacketTraceRow } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function PacketTraceEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'packet_trace')) return null;
  const { rows } = block.props;

  const updateProps = (props: Partial<PacketTraceProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Rows (JSON)</label>
        <textarea
          value={JSON.stringify(rows, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as PacketTraceRow[];
              updateProps({ rows: parsed });
            } catch {
              // ignore invalid JSON
            }
          }}
          rows={8}
        />
      </div>
    </div>
  );
}