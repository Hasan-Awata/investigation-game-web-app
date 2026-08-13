import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminPhase, updateAdminPhase, deleteAdminPhase, fetchAdminCases } from '@/services/adminApi';
import type { GameCase, Phase } from '@/types';

export default function PhaseForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('1');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // STRICT TYPING: Applied GameCase[] to the query
  const { data: cases = [], isLoading: isFetchingCases } = useQuery<GameCase[]>({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  const clearForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setOrderIndex('1');
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminPhase(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Phase created.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminPhase(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Phase updated.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminPhase(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Phase deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('order_index', orderIndex);

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  // STRICT TYPING: Applied Phase interface
  const handleEdit = (phase: Phase, parentCaseId: number) => {
    setEditingId(phase.id);
    setCaseId(parentCaseId.toString());
    setTitle(phase.title);
    setDescription(phase.description || '');
    setOrderIndex(phase.order_index.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (phaseId: number, phaseTitle: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete the "${phaseTitle}" phase? All levels and questions inside it will be orphaned or deleted.`)) {
      setFeedback(null);
      if (editingId === phaseId) clearForm();
      deleteMutation.mutate(phaseId);
    }
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const selectedCase = cases.find((c: GameCase) => c.id.toString() === caseId);

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: 0 }}>
            {editingId ? `// Editing Phase ID: ${editingId}` : '// Initialize New Phase'}
          </h3>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Case</label>
              <select className="admin-input" required value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={isFetchingCases}>
                <option value="" disabled>-- Select a Case --</option>
                {cases.map((c: GameCase) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Chronological Order Index</label>
              <input type="number" className="admin-input" min="1" required value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
            </div>
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
            {editingId ? 'Update Phase' : 'Commit Phase'}
          </button>
        </form>
      </div>

      {selectedCase && selectedCase.phases && selectedCase.phases.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Case Phases</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedCase.phases.map((p: Phase) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>IDX: {p.order_index}</span>
                  <strong>{p.title}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => handleEdit(p, selectedCase.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                  <button type="button" onClick={() => handleDelete(p.id, p.title)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}