import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import type { Question, Choice } from '@/types';
import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { defaultRequirements, defaultOutcomes, buildNodeFormData } from '../Shared/questionUtils';
import './AdminInterrogationBuilder.css';

interface DialogueNodeContainerProps {
  nodeData: Question | any; 
  levelId: string;
  onSaved: () => void;
  onDeleted: () => void;
}

const DialogueNodeContainer = ({ 
  nodeData, levelId, onSaved, onDeleted 
}: DialogueNodeContainerProps) => {
  
  const [text, setText] = useState(nodeData.text || '');
  const isSaved = typeof nodeData.id === 'number';

  const initialChoices: DraftChoice[] = (nodeData.choices || []).map((c: any) => ({
    id: c.id || crypto.randomUUID(),
    text: c.text || '',
    outcomes: { ...defaultOutcomes(), ...(c.outcomes || {}) },
    requirements: { ...defaultRequirements(), ...(c.requirements || {}) }
  }));

  const [choicesState, setChoicesState] = useState<DraftChoice[]>(
    initialChoices.length > 0 ? initialChoices : [{ id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }]
  );

  const { createEntity, updateEntity, deleteEntity, isProcessing, feedback, setFeedback, clearFeedback } = useAdminMutations('question');

  const handleSave = () => {
    clearFeedback();
    if (!text.trim()) return setFeedback({ type: 'error', message: 'Suspect dialogue text cannot be empty.' });
    if (choicesState.some(c => !c.text.trim())) return setFeedback({ type: 'error', message: 'All response branches must have text.' });

    const formData = buildNodeFormData({ level_id: levelId, text, store_locally: false, choices: choicesState });
    
    if (isSaved) {
      updateEntity({ id: nodeData.id, formData }, { onSuccess: onSaved });
    } else {
      createEntity(formData, { onSuccess: onSaved });
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete node?')) {
      deleteEntity(nodeData.id, { onSuccess: onDeleted });
    }
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
          {choicesState.map((choice, index) => (
            <ChoiceEditorCard 
              key={choice.id}
              index={index}
              choice={choice}
              updateChoice={(updated) => {
                const updatedList = choicesState.map(c => c.id === choice.id ? updated : c);
                setChoicesState(updatedList);
              }}
              removeChoice={() => setChoicesState(choicesState.filter(c => c.id !== choice.id))}
            />
          ))}
          <button type="button" className="btn-secondary" style={{ padding: '0.5rem', marginTop: '0.5rem' }} onClick={() => setChoicesState([...choicesState, { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }])}>
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
};

export default function AdminInterrogationBuilder() {
  const [draftNodes, setDraftNodes] = useState<any[]>([]);
  
  const { caseId, levelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();

  if (!caseId || !levelId || !selectedCase || !selectedPhase || !selectedLevel) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: TARGET LEVEL REQUIRED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Case, Phase, and Level from the sidebar to manage interrogation nodes.</p>
      </div>
    );
  }

  if (selectedLevel.presentation_type !== 'interrogation') {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'var(--accent-crimson)' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', margin: '0 0 1rem 0' }}>[ INVALID CONTEXT: LEVEL TYPE MISMATCH ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>The currently selected level is configured for <strong>'{selectedLevel.presentation_type}'</strong>. You cannot build interrogation trees here. Please select an 'Interrogation' level from the sidebar.</p>
      </div>
    );
  }

  const savedNodes: Question[] = selectedLevel.questions || [];
  
  const hasTerminalNode = savedNodes.some((n: Question) => {
    if (!n.choices || n.choices.length === 0) return true;
    return n.choices.some((c: Choice | any) => !c.outcomes?.next_question_id);
  });

  const addDraftNode = () => {
    setDraftNodes([...draftNodes, { id: `draft_${Date.now()}`, text: '', choices: [] }]);
  };

  const handleChildSaved = () => {};

  return (
    <div className="interrogation-canvas-container">
      <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '0' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>// Interrogation Tree Builder</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Targeting: {selectedCase.title} &gt; {selectedPhase.title} &gt; {selectedLevel.title}
        </span>
      </div>

      {!hasTerminalNode && savedNodes.length > 0 && (
        <div className="terminal-text error" style={{ background: 'rgba(163, 50, 50, 0.1)', padding: '1rem', border: '1px solid var(--accent-crimson)', borderRadius: '8px', margin: '0 1rem' }}>
          ⚠️ CRITICAL WARNING: This interrogation tree lacks a terminal state. The team will be soft-locked during gameplay. Please ensure at least one node has zero choices OR a player response is set to [ END CONVERSATION / RETURN TO HUB ].
        </div>
      )}
      
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
          <DialogueNodeContainer 
            key={node.id} 
            nodeData={node} 
            levelId={levelId} 
            onSaved={handleChildSaved} 
            onDeleted={handleChildSaved}
          />
        ))}
        
        {draftNodes.map((node) => (
          <DialogueNodeContainer 
            key={node.id} 
            nodeData={node} 
            levelId={levelId} 
            onSaved={() => { setDraftNodes(draftNodes.filter(d => d.id !== node.id)); }} 
            onDeleted={() => setDraftNodes(draftNodes.filter(d => d.id !== node.id))}
          />
        ))}
        
        {savedNodes.length === 0 && draftNodes.length === 0 && (
          <div className="terminal-text" style={{ gridColumn: '1 / -1' }}>Workspace empty. Append a new node to begin the interrogation sequence.</div>
        )}
      </div>
    </div>
  );
}