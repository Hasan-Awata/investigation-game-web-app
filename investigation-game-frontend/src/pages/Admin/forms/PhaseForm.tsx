import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminPhase, fetchAdminCases } from '@/services/adminApi';

export default function PhaseForm() {
  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('1');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: cases = [], isLoading: isFetchingCases } = useQuery({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminPhase(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Phase successfully created.' });
      setTitle('');
      setDescription('');
      setOrderIndex((prev) => (parseInt(prev) + 1).toString());
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('order_index', orderIndex);

    mutation.mutate(formData);
  };

  return (
    <div className="admin-form-container glass-panel">
      {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Case</label>
            <select className="admin-input" required value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={isFetchingCases}>
              <option value="" disabled>-- Select a Case --</option>
              {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
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

        <button type="submit" className="btn-primary" disabled={mutation.isPending} style={{ background: 'var(--accent-crimson)', marginTop: '1rem' }}>
          {mutation.isPending ? 'Committing...' : 'Commit Phase to Database'}
        </button>
      </form>
    </div>
  );
}