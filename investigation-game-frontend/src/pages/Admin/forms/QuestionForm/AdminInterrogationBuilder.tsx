import { useState } from 'react';
import NodeBuilderCanvas from './NodeBuilderCanvas';
import AdminInterrogationForm from './AdminInterrogationForm';
import { AdminEntryToggle, JsonPopulator } from '@/pages/Admin/components/AdminUI';
import type { Question, Choice } from '@/types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import './AdminInterrogationBuilder.css';

export default function AdminInterrogationBuilder() {
  const [draftNodes, setDraftNodes] = useState<any[]>([]);
  const [entryMode, setEntryMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');
  
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.interrogationBuilder;

  const addDraftNode = () => {
    setDraftNodes([...draftNodes, { id: `draft_${Date.now()}`, text: '', choices: [] }]);
  };

  const handleJsonPopulate = (parsed: any) => {
    if (parsed.nodes && Array.isArray(parsed.nodes)) {
      const newDrafts = parsed.nodes.map((n: any, idx: number) => ({
        id: `draft_${Date.now()}_${idx}`, // Prevents key collision on rapid map
        text: n.text || '',
        choices: n.choices || []
      }));
      setDraftNodes((prev) => [...prev, ...newDrafts]);
    }
    setEntryMode('form');
    setJsonInput('');
  };

  const conversationTemplate = {
    nodes: [
      {
        text: "Where were you on the night of the 14th?",
        choices: [
          {
            text: "Press him on his alibi.",
            outcomes: { feedback: "He seems nervous.", gives_strike: false }
          },
          {
            text: "Accuse him directly.",
            outcomes: { feedback: "He shuts down.", gives_strike: true }
          }
        ]
      }
    ]
  };

  return (
    <NodeBuilderCanvas requiredType="interrogation" title={t.canvasTitle}>
      {({ levelId, savedNodes }) => {
        // Domain-specific logic remains isolated here
        const hasTerminalNode = savedNodes.some((n: Question) => {
          if (!n.choices || n.choices.length === 0) return true;
          return n.choices.some((c: Choice | any) => !c.outcomes?.next_question_id);
        });

        return (
          <>
            {!hasTerminalNode && savedNodes.length > 0 && (
              <div className="terminal-text error" style={{ background: 'rgba(163, 50, 50, 0.1)', padding: '1rem', border: '1px solid var(--accent-crimson)', borderRadius: '8px', margin: '0 1rem 1rem' }}>
                {t.criticalWarning}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {t.nodeStats(savedNodes.length, draftNodes.length)}
              </span>
              {entryMode === 'form' && (
                <button className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={addDraftNode}>
                  {t.appendNodeBtn}
                </button>
              )}
            </div>

            <div style={{ padding: '0 1rem' }}>
              <AdminEntryToggle 
                mode={entryMode} 
                setMode={setEntryMode} 
                labelForm="Visual Workspace" 
                labelJson="JSON Bulk Conversation" 
              />
            </div>

            {entryMode === 'form' ? (
              <div className="interrogation-workspace">
                {savedNodes.map((node) => (
                  <AdminInterrogationForm key={node.id} nodeData={node} levelId={levelId} onSaved={() => {}} onDeleted={() => {}} />
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
                  <div className="terminal-text" style={{ gridColumn: '1 / -1' }}>{t.emptyWorkspace}</div>
                )}
              </div>
            ) : (
              <div style={{ padding: '0 1rem', marginBottom: '2rem' }}>
                <JsonPopulator 
                  jsonInput={jsonInput} 
                  setJsonInput={setJsonInput} 
                  onPopulate={handleJsonPopulate} 
                  requiredFields={['nodes']}
                  template={conversationTemplate}
                />
              </div>
            )}
          </>
        );
      }}
    </NodeBuilderCanvas>
  );
}