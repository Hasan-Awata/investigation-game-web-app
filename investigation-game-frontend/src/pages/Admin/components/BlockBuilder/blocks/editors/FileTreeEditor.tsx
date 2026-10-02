import type { TerminalBlock, FileTreeProps, FileTreeEntry } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function FileTreeEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'file_tree')) return null;
  const { entries, indent = 2 } = block.props;

  const updateProps = (props: Partial<FileTreeProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Indent</label>
        <input type="number" value={indent} onChange={(e) => updateProps({ indent: Number(e.target.value) })} min="0" max="10" />
      </div>
      <div className="terminal-editor__field">
        <label>Entries (JSON)</label>
        <textarea
          value={JSON.stringify(entries, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as FileTreeEntry[];
              updateProps({ entries: parsed });
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