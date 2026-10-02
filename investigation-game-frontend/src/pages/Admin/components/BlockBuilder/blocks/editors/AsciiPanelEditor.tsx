import type { TerminalBlock, AsciiPanelProps } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function AsciiPanelEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'ascii_panel')) return null;
  const { lines, caption, frame = 'box' } = block.props;

  const updateProps = (props: Partial<AsciiPanelProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Frame</label>
        <select value={frame} onChange={(e) => updateProps({ frame: e.target.value as AsciiPanelProps['frame'] })}>
          <option value="box">Box</option>
          <option value="heavy">Heavy</option>
          <option value="none">None</option>
        </select>
      </div>
      <div className="terminal-editor__field">
        <label>Caption</label>
        <input type="text" value={caption ?? ''} onChange={(e) => updateProps({ caption: e.target.value })} />
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