import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import type { Question, Choice, Evidence, Level, Suspect, Victim } from '@/types';
import { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { defaultRequirements, defaultOutcomes, buildNodeFormData } from '../Shared/questionUtils';
import AdminInterrogationForm from './AdminInterrogationForm';
import './AdminInterrogationBuilder.css';

interface DialogueNodeContainerProps {
  nodeData: Question | any; 
  levelId: string;
  allSavedNodes: Question[];
  availableEvidences: Evidence[];
  availableLevels: Level[];
  availableSuspects: Suspect[];
  availableVictims: Victim[];
  onSaved: () => void;
  onDeleted: () => void;
}

const DialogueNodeContainer = ({ 
  nodeData, levelId, allSavedNodes, availableEvidences, availableLevels, availableSuspects, availableVictims, onSaved, onDeleted 
}: DialogueNodeContainerProps) => {
  
  // SECURE MAPPER: Forces all ID arrays to be Number[] to satisfy TS
  const safeChoices: DraftChoice[] = (nodeData.choices || []).map((c: Choice | any) => ({
    id: c.id || crypto.randomUUID(),
    text: c.text || '',
    outcomes: {
      feedback: c.outcomes?.feedback || '',
      next_question_id: c.outcomes?.next_question_id ? Number(c.outcomes.next_question_id) : null,
      gives_strike: !!c.outcomes?.gives_strike,
      unlock_evidence: c.outcomes?.unlock_evidence?.map(Number) || [],
      unlock_levels: c.outcomes?.unlock_levels?.map(Number) || [],
      unlock_suspects: c.outcomes?.unlock_suspects?.map(Number) || [],
      unlock_victims: c.outcomes?.unlock_victims?.map(Number) || []
    },
    requirements: {
      required_evidence: c.requirements?.required_evidence?.map(Number) || [],
      required_choices: c.requirements?.required_choices?.map(Number) || []
    }
  }));

  const [text, setText] = useState(nodeData.text || '');
  const [choices, setChoices] = useState<DraftChoice[]>(safeChoices.length > 0 ? safeChoices : [
    { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }
  ]);
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  
  const isSaved = typeof nodeData.id === 'number';

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback, setFeedback, clearFeedback 
  } = useAdminMutations('question');

  const handleSave = () => {
    clearFeedback();

    if (!text.trim()) return setFeedback({ type: 'error', message: 'Suspect dialogue text cannot be empty.' });
    if (choices.some(c => !c.text.trim())) return setFeedback({ type: 'error', message: 'All response branches must have text.' });

    const formData = buildNodeFormData({
      level_id: levelId,
      text,
      store_locally: false,
      choices
    });
    
    if (isSaved) {
      updateEntity({ id: nodeData.id, formData }, { onSuccess: onSaved });
    } else {
      createEntity(formData, { onSuccess: onSaved });
    }
  };

  const handleDelete = () => {
    if(window.confirm('Delete node?')) {
      deleteEntity(nodeData.id, { onSuccess: onDeleted });
    }
  };

  const updateChoice = (id: string, field: keyof DraftChoice | string, value: any, category?: 'outcomes' | 'requirements') => {
    setChoices(choices.map(c => {
      if (c.id !== id) return c;
      if (category) {
        return { 
          ...c, 
          [category]: { 
            ...(c[category] || {}), 
            [field]: value 
          } 
        };
      }
      return { ...c, [field]: value };
    }));
  };

  const addChoice = () => {
    setChoices([...choices, { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }]);
  };

  const removeChoice = (id: string) => {
    setChoices(choices.filter(c => c.id !== id));
  };

  return (
    <AdminInterrogationForm 
      isSaved={isSaved} nodeId={nodeData.id} text={text} setText={setText}
      choices={choices} updateChoice={updateChoice} addChoice={addChoice} removeChoice={removeChoice}
      showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} handleSave={handleSave}
      handleDelete={handleDelete} isProcessing={isProcessing} feedback={feedback}
      allSavedNodes={allSavedNodes} availableEvidences={availableEvidences}
      availableLevels={availableLevels} availableSuspects={availableSuspects} availableVictims={availableVictims}
    />
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
  
  // Extract all the required global arrays for the UI form
  const hasTerminalNode = savedNodes.some((n: Question) => !n.choices || n.choices.length === 0);
  const availableEvidences = selectedCase.evidences || [];
  const availableSuspects = selectedCase.suspects || [];
  const availableVictims = selectedCase.victims || [];
  const availableLevels = selectedCase.phases?.flatMap(p => p.levels || []) || [];

  const addDraftNode = () => {
    setDraftNodes([...draftNodes, { id: `draft_${Date.now()}`, text: '', choices: [] }]);
  };

  const handleChildSaved = () => {
    // Data hook caches automatically; invalidation is handled in the custom hook
  };

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
          ⚠️ CRITICAL WARNING: This interrogation tree lacks a terminal node (a node with zero responses). The team will be soft-locked during gameplay. Please append at least one node with empty choices to conclude the interaction.
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
            allSavedNodes={savedNodes}
            availableEvidences={availableEvidences}
            availableLevels={availableLevels}
            availableSuspects={availableSuspects}
            availableVictims={availableVictims}
            onSaved={handleChildSaved} 
            onDeleted={handleChildSaved}
          />
        ))}
        
        {draftNodes.map((node) => (
          <DialogueNodeContainer 
            key={node.id} 
            nodeData={node} 
            levelId={levelId} 
            allSavedNodes={savedNodes}
            availableEvidences={availableEvidences}
            availableLevels={availableLevels}
            availableSuspects={availableSuspects}
            availableVictims={availableVictims}
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