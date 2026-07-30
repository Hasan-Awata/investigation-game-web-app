import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminCase, fetchAdminCases, deleteAdminCase } from '@/services/adminApi';

export default function CaseForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [minPlayerXP, setMinPlayerXP] = useState('0');
  const [xpOnSolve, setXpOnSolve] = useState('100');
  const [image, setImage] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch cases to display them for deletion
  const { data: cases = [], isLoading: isFetchingCases } = useQuery({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminCase(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Case successfully added to the database.' });
      setTitle('');
      setStory('');
      setMinPlayerXP('0');
      setXpOnSolve('100');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['adminCases'] }); // Refresh list
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (caseId: number) => {
      const result = await deleteAdminCase(caseId);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Case and media wiped completely.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] }); // Refresh list
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('story', story);
    formData.append('min_player_XP', minPlayerXP);
    formData.append('XP_on_solve', xpOnSolve);
    if (image) formData.append('image', image);

    createMutation.mutate(formData);
  };

  const handleDelete = (caseId: number, caseTitle: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete "${caseTitle}"? All nested levels, evidence, and media will be wiped permanently.`)) {
      setFeedback(null);
      deleteMutation.mutate(caseId);
    }
  };

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* CREATION FORM */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Initialize New Case</h3>
        
        {feedback && (
          <div className={`status-message ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Case Title</label>
            <input 
              type="text" className="admin-input" required
              value={title} onChange={(e) => setTitle(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Official Briefing (Story)</label>
            <textarea 
              className="admin-textarea" required
              value={story} onChange={(e) => setStory(e.target.value)} 
            />
          </div>

          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Minimum XP Required</label>
              <input 
                type="number" className="admin-input" min="0" required
                value={minPlayerXP} onChange={(e) => setMinPlayerXP(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>XP Reward on Solve</label>
              <input 
                type="number" className="admin-input" min="0" required
                value={xpOnSolve} onChange={(e) => setXpOnSolve(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Cover Image (Optional)</label>
            <input 
              type="file" className="admin-file-input" accept="image/*"
              ref={fileInputRef}
              onChange={(e) => setImage(e.target.files?.[0] || null)} 
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={createMutation.isPending || deleteMutation.isPending}
            style={{ background: 'var(--accent-crimson)', marginTop: '1rem', color: 'var(--bg-dark)' }}
          >
            {createMutation.isPending ? 'Uploading Data...' : 'Commit Case to Database'}
          </button>
        </form>
      </div>

      {/* DELETION MANAGER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Manage Existing Cases</h3>
        
        {isFetchingCases ? (
          <div className="terminal-text" style={{ padding: 0, textAlign: 'left' }}>Loading archive...</div>
        ) : cases.length === 0 ? (
          <div className="terminal-text" style={{ padding: 0, textAlign: 'left', color: 'var(--text-secondary)' }}>No cases in database.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cases.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>ID: {c.id}</span>
                  <strong>{c.title}</strong>
                </div>
                <button 
                  onClick={() => handleDelete(c.id, c.title)}
                  disabled={deleteMutation.isPending || createMutation.isPending}
                  style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                >
                  Delete Data
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}