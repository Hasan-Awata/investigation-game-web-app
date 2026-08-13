import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import EntityList from './Shared/EntityList';
import type { Phase } from '@/types';

export default function PhaseForm() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('1');

  const { caseId, selectedCase } = useAdminContext();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback, clearFeedback
  } = useAdminMutations('phase');

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory in the sidebar to manage its Phases.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null);
    setTitle(''); setDescription(''); setOrderIndex('1');
    clearFeedback();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('order_index', orderIndex);

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEdit = (phase: Phase) => {
    setEditingId(phase.id);
    setTitle(phase.title);
    setDescription(phase.description || '');
    setOrderIndex(phase.order_index.toString());
    clearFeedback();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (phase: Phase) => {
    if (window.confirm(`Are you absolutely sure you want to delete the "${phase.title}" phase? All levels and questions inside it will be orphaned or deleted.`)) {
      if (editingId === phase.id) clearForm();
      deleteEntity(phase.id);
    }
  };

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `// Editing Phase ID: ${editingId}` : '// Initialize New Phase'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Targeting Case: {selectedCase.title}</span>
          </div>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Chronological Order Index</label>
            <input type="number" className="admin-input" min="1" required value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Phase Title (e.g. "The Setup", "The Alibi")</label>
            <input type="text" className="admin-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Description (Optional Narrative Fluff)</label>
            <textarea className="admin-textarea" style={{ minHeight: '100px' }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Phase' : 'Commit Phase'}
          </button>
        </form>
      </div>

      <EntityList<Phase>
        title={`Active Phases in ${selectedCase.title}`}
        items={selectedCase.phases || []}
        emptyMessage="No phases assigned to this case."
        keyExtractor={(p) => p.id}
        isProcessing={isProcessing}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItemContent={(p) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>IDX: {p.order_index}</span>
            <strong>{p.title}</strong>
          </>
        )}
      />
    </div>
  );
}