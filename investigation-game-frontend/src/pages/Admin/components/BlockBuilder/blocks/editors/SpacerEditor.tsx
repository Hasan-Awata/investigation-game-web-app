import type { TerminalBlock } from '@/types/evidence/terminal';
import type { SpacerProps } from '@/types/evidence/shared';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function SpacerEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'spacer')) return null;
  const { height = 24 } = block.props;

  const updateProps = (props: Partial<SpacerProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Height (px)</label>
        <input type="number" value={height} onChange={(e) => updateProps({ height: Number(e.target.value) })} min="0" max="500" />
      </div>
    </div>
  );
}