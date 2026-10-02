import type { TerminalBlock, HashMatrixProps, HashMatrixRow } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function HashMatrixEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'hash_matrix')) return null;
  const { rows, algorithm } = block.props;

  const updateProps = (props: Partial<HashMatrixProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Algorithm</label>
        <input type="text" value={algorithm} onChange={(e) => updateProps({ algorithm: e.target.value })} />
      </div>
      <div className="terminal-editor__field">
        <label>Rows (JSON)</label>
        <textarea
          value={JSON.stringify(rows, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as HashMatrixRow[];
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