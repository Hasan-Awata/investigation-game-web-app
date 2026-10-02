import type { TerminalBlock, StatusBannerProps } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function StatusBannerEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'status_banner')) return null;
  const { text, tone = 'info', caption } = block.props;

  const updateProps = (props: Partial<StatusBannerProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Text</label>
        <input type="text" value={text} onChange={(e) => updateProps({ text: e.target.value })} />
      </div>
      <div className="terminal-editor__field">
        <label>Tone</label>
        <select value={tone} onChange={(e) => updateProps({ tone: e.target.value as StatusBannerProps['tone'] })}>
          <option value="info">info</option>
          <option value="ok">ok</option>
          <option value="warn">warn</option>
          <option value="critical">critical</option>
        </select>
      </div>
      <div className="terminal-editor__field">
        <label>Caption</label>
        <input type="text" value={caption ?? ''} onChange={(e) => updateProps({ caption: e.target.value })} />
      </div>
    </div>
  );
}