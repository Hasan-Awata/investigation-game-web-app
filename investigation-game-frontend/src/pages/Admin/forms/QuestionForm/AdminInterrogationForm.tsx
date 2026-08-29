import type { Question } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';

interface AdminInterrogationFormProps {
  isSaved: boolean;
  nodeId: number | string;
  text: string;
  setText: (text: string) => void;
  choices: DraftChoice[];
  updateChoice: (id: string, field: string, value: any, category?: 'outcomes' | 'requirements') => void;
  addChoice: () => void;
  removeChoice: (id: string) => void;
  showAdvanced: Record<string, boolean>;
  setShowAdvanced: (val: Record<string, boolean>) => void;
  handleSave: () => void;
  handleDelete: () => void;
  isProcessing: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  
  // Global assets
  allSavedNodes: Question[];
}

export default function AdminInterrogationForm({
  isSaved, nodeId, text, setText, choices, updateChoice, addChoice, removeChoice,
  showAdvanced, setShowAdvanced, handleSave, handleDelete, isProcessing, feedback,
  allSavedNodes
}: AdminInterrogationFormProps) {

  const allAvailablePriorChoices = allSavedNodes
    .filter(n => n.id !== nodeId)
    .flatMap(node => 
      (node.choices || []).map(c => ({
        id: c.id,
        label: `Node ${node.id}: "${c.text.substring(0, 30)}..."`
      }))
    );

  return (
    <div className={`dialogue-node-card ${isSaved ? '' : 'unsaved'}`}>
      <div className="node-header">
        <span className="node-id-badge">{isSaved ? `NODE ID: ${nodeId}` : 'UNSAVED DRAFT NODE'}</span>
        {feedback && <span style={{ fontSize: '0.75rem', color: feedback.type === 'success' ? 'var(--accent-success)' : 'var(--accent-crimson)' }}>{feedback.message}</span>}
      </div>

      <div className="node-body">
        <div className="node-suspect-block">
          <label>Suspect Dialogue</label>
          <textarea className="admin-textarea" dir="auto" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: '80px' }} placeholder="Suspect says..." />
        </div>

        <div className="node-responses-block">
          <label>Player Responses & Branches</label>
          {choices.map((choice) => (
            <div key={choice.id} className="response-branch">
              <input type="text" className="admin-input" dir="auto" value={choice.text} onChange={(e) => updateChoice(choice.id as string, 'text', e.target.value)} placeholder="Player says..." />
              
              <div className="branch-link-row">
                <span className="link-icon">➔</span>
                <select 
                  className="admin-input" 
                  style={{ flex: 1, padding: '0.5rem' }}
                  value={choice.outcomes?.next_question_id?.toString() || ''}
                  onChange={(e) => updateChoice(choice.id as string, 'next_question_id', e.target.value ? Number(e.target.value) : null, 'outcomes')}
                >
                  <option value="">[ END CONVERSATION / RETURN TO HUB ]</option>
                  {allSavedNodes.filter((n) => n.id !== nodeId).map((n) => (
                    <option key={n.id} value={n.id}>Leads to Node {n.id} ({n.text.substring(0, 20)}...)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }} onClick={() => setShowAdvanced({...showAdvanced, [choice.id as string]: !showAdvanced[choice.id as string]})}>
                  {showAdvanced[choice.id as string] ? 'Hide Advanced Intel' : '⚙️ Advanced Intel & Locks'}
                </button>
                <button type="button" onClick={() => removeChoice(choice.id as string)} style={{ background: 'none', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer' }}>✕</button>
              </div>

              {showAdvanced[choice.id as string] && (
                <div className="advanced-intel-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
                  <div style={{ border: '1px dashed var(--accent-amber)', padding: '0.75rem', borderRadius: '6px', background: 'rgba(196, 139, 54, 0.05)' }}>
                    <h6 style={{ color: 'var(--accent-amber)', margin: '0 0 0.75rem 0', fontFamily: 'var(--font-mono)' }}>[ GATEKEEPERS ]</h6>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.7rem' }}>Requires Prior Dialogue Choice</label>
                      <select multiple className="admin-input" style={{ height: '80px', padding: '0.25rem' }} value={choice.requirements?.required_choices?.map(String) || []} onChange={(e) => updateChoice(choice.id as string, 'required_choices', Array.from(e.target.selectedOptions, opt => Number(opt.value)), 'requirements')}>
                        {allAvailablePriorChoices.map((c) => <option key={c.id} value={c.id?.toString()}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn-secondary" style={{ padding: '0.5rem', marginTop: '0.5rem' }} onClick={addChoice}>
            + Add Response Branch
          </button>
        </div>
      </div>

      <div className="node-footer">
        <button className="btn-primary" onClick={handleSave} disabled={isProcessing}>
          {isProcessing ? 'Syncing...' : isSaved ? 'Update Node' : 'Commit New Node'}
        </button>
        {isSaved && (
          <button className="btn-secondary" style={{ borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }} onClick={handleDelete} disabled={isProcessing}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}