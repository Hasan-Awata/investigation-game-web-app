import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import LevelBuilderGuard from '../Shared/LevelBuilderGuard';
import AdminInterrogationForm from './AdminInterrogationForm';
import type { Question, Choice } from '@/types';
import './AdminInterrogationBuilder.css';

export default function AdminInterrogationBuilder() {
  const [draftNodes, setDraftNodes] = useState<any[]>([]);
  const { levelId, selectedCase, selectedPhase, selectedLevel } = useAdminContext();

  const savedNodes: Question[] = selectedLevel?.questions || [];

  const hasTerminalNode = savedNodes.some((n: Question) => {
    if (!n.choices || n.choices.length === 0) return true;
    return n.choices.some((c: Choice | any) => !c.outcomes?.next_question_id);
  });

  const addDraftNode = () => {
    setDraftNodes([...draftNodes, { id: `draft_${Date.now()}`, text: '', choices: [] }]);
  };

  const handleChildSaved = () => {};

  return (
    <LevelBuilderGuard requiredType="interrogation">
      <div className="interrogation-canvas-container">
        <div className="admin-form-container glass-panel" style={{ padding: '1.5rem', marginBottom: '0' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>// Interrogation Tree Builder</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Targeting: {selectedCase?.title} &gt; {selectedPhase?.title} &gt; {selectedLevel?.title}
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
            <AdminInterrogationForm
              key={node.id}
              nodeData={node}
              levelId={levelId}
              onSaved={handleChildSaved}
              onDeleted={handleChildSaved}
            />
          ))}

          {draftNodes.map((node) => (
            <AdminInterrogationForm
              key={node.id}
              nodeData={node}
              levelId={levelId}
              onSaved={() => setDraftNodes(draftNodes.filter(d => d.id !== node.id))}
              onDeleted={() => setDraftNodes(draftNodes.filter(d => d.id !== node.id))}
            />
          ))}

          {savedNodes.length === 0 && draftNodes.length === 0 && (
            <div className="terminal-text" style={{ gridColumn: '1 / -1' }}>Workspace empty. Append a new node to begin the interrogation sequence.</div>
          )}
        </div>
      </div>
    </LevelBuilderGuard>
  );
}