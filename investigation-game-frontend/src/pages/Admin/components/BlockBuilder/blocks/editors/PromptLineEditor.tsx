import type { TerminalBlock, PromptLineProps } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function PromptLineEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'prompt_line')) return null;
  const { prompt, command, output, tone = 'stdout' } = block.props;

  const updateProps = (props: Partial<PromptLineProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Prompt</label>
        <input type="text" value={prompt} onChange={(e) => updateProps({ prompt: e.target.value })} />
      </div>
      <div className="terminal-editor__field">
        <label>Command</label>
        <input type="text" value={command} onChange={(e) => updateProps({ command: e.target.value })} />
      </div>
      <div className="terminal-editor__field">
        <label>Tone</label>
        <select value={tone} onChange={(e) => updateProps({ tone: e.target.value as PromptLineProps['tone'] })}>
          <option value="stdout">stdout</option>
          <option value="stderr">stderr</option>
          <option value="warn">warn</option>
          <option value="ok">ok</option>
          <option value="info">info</option>
        </select>
      </div>
      <div className="terminal-editor__field">
        <label>Output Lines</label>
        <textarea
          value={output.join('\n')}
          onChange={(e) => updateProps({ output: e.target.value.split('\n') })}
          rows={4}
        />
      </div>
    </div>
  );
}