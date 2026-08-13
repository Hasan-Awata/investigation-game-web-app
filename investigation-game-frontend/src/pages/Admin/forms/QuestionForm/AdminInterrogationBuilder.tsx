// FILE: src/pages/Admin/forms/LevelForm/AdminInterrogationBuilder.tsx

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminQuestion, updateAdminQuestion, deleteAdminQuestion, fetchAdminCases } from '@/services/adminApi';
import type { GameCase, Question, Choice, Evidence } from '@/types';
import { defaultRequirements, defaultOutcomes, appendChoicesToFormData } from '../Shared/questionUtils';
import './AdminInterrogationBuilder.css';

// --- SINGLE NODE (CARD) COMPONENT ---
interface DialogueNodeProps {
  nodeData: Question | any; // Accept Draft nodes which may not be full Questions yet
  levelId: string;
  allSavedNodes: Question[];
  availableEvidences: Evidence[];
  onSaved: () => void;
  onDeleted: () => void;
}

const DialogueNode = ({ 
  nodeData, levelId, allSavedNodes, availableEvidences, onSaved, onDeleted 
}: DialogueNodeProps) => {
  
  const safeChoices = (nodeData.choices || []).map((c: Choice | any) => ({
    id: c.id || crypto.randomUUID(),
    text: c.text || '',
    outcomes: {
      feedback: c.outcomes?.feedback || '',
      next_question_id: c.outcomes?.next_question_id?.toString() || '',
      gives_strike: !!c.outcomes?.gives_strike,
      unlock_evidence: c.outcomes?.unlock_evidence?.map(String) || [],
      unlock_levels: c.outcomes?.unlock_levels?.map(String) || [],
      unlock_suspects: c.outcomes?.unlock_suspects?.map(String) || [],
      unlock_victims: c.outcomes?.unlock_victims?.map(String) || []
    },
    requirements: {
      required_evidence: c.requirements?.required_evidence?.map(String) || [],
      required_choices: c.requirements?.required_choices?.map(String) || []
    }
  }));

  const [text, setText] = useState(nodeData.text || '');
  const [choices, setChoices] = useState<any[]>(safeChoices.length > 0 ? safeChoices : [
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }
  ]);
  
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{type: string, message: string} | null>(null);

  const isSaved = typeof nodeData.id === 'number';

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (isSaved) return (await updateAdminQuestion(nodeData.id, formData)).value;
      return (await createAdminQuestion(formData)).value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Node synced.' });
      setTimeout(() => setFeedback(null), 2000);
      onSaved(); 
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async () => (await deleteAdminQuestion(nodeData.id)).value,
    onSuccess: () => onDeleted(),
  });

  const handleSave = () => {
    setFeedback(null);
    const formData = new FormData();
    formData.append('level_id', levelId.toString());
    formData.append('text', text);
    formData.append('is_mandatory', '1'); 
    formData.append('store_locally', '0');

    appendChoicesToFormData(formData, choices);
    saveMutation.mutate(formData);
  };

  const updateChoice = (id: string, field: string, value: any, category?: 'outcomes' | 'requirements') => {
    setChoices(choices.map(c => {
      if (c.id !== id) return c;
      if (category) return { ...c, [category]: { ...c[category], [field]: value } };
      return { ...c, [field]: value };
    }));
  };

  return (
    <div className={`dialogue-node-card ${isSaved ? '' : 'unsaved'}`}>
      <div className="node-header">
        <span className="node-id-badge">{isSaved ? `NODE ID: ${nodeData.id}` : 'UNSAVED DRAFT NODE'}</span>
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
              <input type="text" className="admin-input" dir="auto" value={choice.text} onChange={(e) => updateChoice(choice.id, 'text', e.target.value)} placeholder="Player says..." />
              
              <div className="branch-link-row">
                <span className="link-icon">➔</span>
                <select 
                  className="admin-input" 
                  style={{ flex: 1, padding: '0.5rem' }}
                  value={choice.outcomes.next_question_id || ''}
                  onChange={(e) => updateChoice(choice.id, 'next_question_id', e.target.value, 'outcomes')}
                >
                  <option value="">[ END CONVERSATION / RETURN TO HUB ]</option>
                  {allSavedNodes.filter((n) => n.id !== nodeData.id).map((n) => (
                    <option key={n.id} value={n.id}>Leads to Node {n.id} ({n.text.substring(0, 20)}...)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }} onClick={() => setShowAdvanced({...showAdvanced, [choice.id]: !showAdvanced[choice.id]})}>
                  {showAdvanced[choice.id] ? 'Hide Advanced Intel' : '⚙️ Advanced Intel & Locks'}
                </button>
                <button type="button" onClick={() => setChoices(choices.filter(c => c.id !== choice.id))} style={{ background: 'none', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer' }}>✕</button>
              </div>

              {showAdvanced[choice.id] && (
                <div className="advanced-intel-panel">
                  <label style={{ fontSize: '0.7rem', color: 'var(--accent-amber)' }}>Requires Evidence to Say</label>
                  <select multiple className="admin-input" style={{ height: '60px', padding: '0.25rem' }} value={choice.requirements.required_evidence || []} onChange={(e) => updateChoice(choice.id, 'required_evidence', Array.from(e.target.selectedOptions, opt => opt.value), 'requirements')}>
                    {availableEvidences.map((ev) => <option key={ev.id} value={ev.id}>EX-{ev.id} {ev.title}</option>)}
                  </select>

                  <label style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '0.5rem' }}>Unlocks Evidence on Click</label>
                  <select multiple className="admin-input" style={{ height: '60px', padding: '0.25rem' }} value={choice.outcomes.unlock_evidence || []} onChange={(e) => updateChoice(choice.id, 'unlock_evidence', Array.from(e.target.selectedOptions, opt => opt.value), 'outcomes')}>
                    {availableEvidences.map((ev) => <option key={ev.id} value={ev.id}>EX-{ev.id} {ev.title}</option>)}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input type="checkbox" checked={choice.outcomes.gives_strike} onChange={(e) => updateChoice(choice.id, 'gives_strike', e.target.checked, 'outcomes')} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-crimson)' }}>Triggers Strike (Penalty)</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn-secondary" style={{ padding: '0.5rem', marginTop: '0.5rem' }} onClick={() => setChoices([...choices, { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }])}>
            + Add Response Branch
          </button>
        </div>
      </div>

      <div className="node-footer">
        <button className="btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Syncing...' : isSaved ? 'Update Node' : 'Commit New Node'}
        </button>
        {isSaved && (
          <button className="btn-secondary" style={{ borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }} onClick={() => { if(window.confirm('Delete node?')) deleteMutation.mutate(); }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

// --- MAIN BUILDER ---
export default function AdminInterrogationBuilder() {
  const queryClient = useQueryClient();
  const [caseId, setCaseId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [draftNodes, setDraftNodes] = useState<any[]>([]);

  const { data: cases = [] } = useQuery<GameCase[]>({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  const selectedCase = cases.find((c) => c.id.toString() === caseId);
  const availablePhases = selectedCase?.phases || [];
  const selectedPhase = availablePhases.find((p) => p.id.toString() === phaseId);
  const availableLevels = (selectedPhase?.levels || []).filter((l) => l.presentation_type === 'interrogation');
  const selectedLevel = availableLevels.find((l) => l.id.toString() === levelId);

  const savedNodes: Question[] = selectedLevel?.questions || [];
  
  const refreshData = () => queryClient.invalidateQueries({ queryKey: ['adminCases'] });

  const addDraftNode = () => {
    setDraftNodes([...draftNodes, { id: `draft_${Date.now()}`, text: '', choices: [] }]);
  };

  return (
    <div className="interrogation-canvas-container">
      <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '0' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 1.5rem 0' }}>// Interrogation Tree Builder</h3>
        <div className="admin-form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Case</label>
            <select className="admin-input" value={caseId} onChange={(e) => { setCaseId(e.target.value); setPhaseId(''); setLevelId(''); }}>
              <option value="">-- Select Case --</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Phase</label>
            <select className="admin-input" value={phaseId} onChange={(e) => { setPhaseId(e.target.value); setLevelId(''); }} disabled={!caseId}>
              <option value="">-- Select Phase --</option>
              {availablePhases.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Interrogation Level</label>
            <select className="admin-input" value={levelId} onChange={(e) => { setLevelId(e.target.value); setDraftNodes([]); }} disabled={!phaseId}>
              <option value="">-- Select Interrogation Level --</option>
              {availableLevels.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {levelId ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Total Nodes: {savedNodes.length} (Saved) + {draftNodes.length} (Drafts)
            </span>
            <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={addDraftNode}>
              + Append New Node
            </button>
          </div>

          <div className="interrogation-workspace">
            {savedNodes.map((node) => (
              <DialogueNode 
                key={node.id} 
                nodeData={node} 
                levelId={levelId} 
                allSavedNodes={savedNodes}
                availableEvidences={selectedCase?.evidences || []} 
                onSaved={refreshData} 
                onDeleted={refreshData}
              />
            ))}
            
            {draftNodes.map((node) => (
              <DialogueNode 
                key={node.id} 
                nodeData={node} 
                levelId={levelId} 
                allSavedNodes={savedNodes}
                availableEvidences={selectedCase?.evidences || []} 
                onSaved={() => { setDraftNodes(draftNodes.filter(d => d.id !== node.id)); refreshData(); }} 
                onDeleted={() => setDraftNodes(draftNodes.filter(d => d.id !== node.id))}
              />
            ))}
            
            {savedNodes.length === 0 && draftNodes.length === 0 && (
              <div className="terminal-text" style={{ gridColumn: '1 / -1' }}>Workspace empty. Append a new node to begin the interrogation sequence.</div>
            )}
          </div>
        </>
      ) : (
        <div className="terminal-text">Please select a valid Interrogation level to open the visual builder.</div>
      )}
    </div>
  );
}