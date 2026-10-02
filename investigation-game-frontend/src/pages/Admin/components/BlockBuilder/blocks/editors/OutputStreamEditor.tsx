import type { TerminalBlock, OutputStreamProps } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function OutputStreamEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'output_stream')) return null;
  const { lines, tone = 'stdout', label } = block.props;

  const updateProps = (props: Partial<OutputStreamProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Label</label>
        <input type="text" value={label ?? ''} onChange={(e) => updateProps({ label: e.target.value })} />
      </div>
      <div className="terminal-editor__field">
        <label>Tone</label>
        <select value={tone} onChange={(e) => updateProps({ tone: e.target.value as OutputStreamProps['tone'] })}>
          <option value="stdout">stdout</option>
          <option value="stderr">stderr</option>
          <option value="warn">warn</option>
          <option value="ok">ok</option>
          <option value="info">info</option>
        </select>
      </div>
      <div className="terminal-editor__field">
        <label>Lines</label>
        <textarea
          value={lines.join('\n')}
          onChange={(e) => updateProps({ lines: e.target.value.split('\n') })}
          rows={6}
        />
      </div>
    </div>
  );
}