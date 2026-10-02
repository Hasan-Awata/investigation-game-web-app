import type { TerminalBlock, EncryptionFlowProps, EncryptionFlowStep } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';

interface EditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

export default function EncryptionFlowEditor({ block, onUpdate }: EditorProps) {
  if (!isTerminalBlock(block, 'encryption_flow')) return null;
  const { steps, direction = 'v', algorithm } = block.props;

  const updateProps = (props: Partial<EncryptionFlowProps>) => {
    onUpdate({ ...block, props: { ...block.props, ...props } });
  };

  const handleStepsChange = (newSteps: EncryptionFlowStep[]) => {
    updateProps({ steps: newSteps });
  };

  return (
    <div className="terminal-editor">
      <div className="terminal-editor__field">
        <label>Algorithm</label>
        <input
          type="text"
          value={algorithm ?? ''}
          onChange={(e) => updateProps({ algorithm: e.target.value })}
          placeholder="aes, rsa, chacha..."
        />
      </div>
      <div className="terminal-editor__field">
        <label>Direction</label>
        <select value={direction} onChange={(e) => updateProps({ direction: e.target.value as EncryptionFlowProps['direction'] })}>
          <option value="v">Vertical</option>
          <option value="h">Horizontal</option>
        </select>
      </div>
      <div className="terminal-editor__field">
        <label>Steps</label>
        <div className="terminal-editor__steps">
          {steps.map((step, i) => (
            <div key={i} className="terminal-editor__step">
              <input
                type="text"
                placeholder="Label"
                value={step.label}
                onChange={(e) => {
                  const newSteps = [...steps];
                  newSteps[i] = { ...newSteps[i], label: e.target.value };
                  handleStepsChange(newSteps);
                }}
              />
              <input
                type="text"
                placeholder="Detail"
                value={step.detail ?? ''}
                onChange={(e) => {
                  const newSteps = [...steps];
                  newSteps[i] = { ...newSteps[i], detail: e.target.value };
                  handleStepsChange(newSteps);
                }}
              />
              <input
                type="text"
                placeholder="Token"
                value={step.token ?? ''}
                onChange={(e) => {
                  const newSteps = [...steps];
                  newSteps[i] = { ...newSteps[i], token: e.target.value };
                  handleStepsChange(newSteps);
                }}
              />
              <button type="button" onClick={() => {
                const newSteps = steps.filter((_, idx) => idx !== i);
                handleStepsChange(newSteps);
              }}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => handleStepsChange([...steps, { label: '', detail: '', token: '' }])}>
            Add Step
          </button>
        </div>
      </div>
    </div>
  );
}