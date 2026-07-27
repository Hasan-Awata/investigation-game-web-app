import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createAdminCase } from '@/services/adminApi';

export default function CaseForm() {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [minPlayerXP, setMinPlayerXP] = useState('0');
  const [xpOnSolve, setXpOnSolve] = useState('100');
  const [image, setImage] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminCase(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Case successfully added to the database.' });
      // Reset form
      setTitle('');
      setStory('');
      setMinPlayerXP('0');
      setXpOnSolve('100');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (image) {
      formData.append('image', image);
    }

    mutation.mutate(formData);
  };

  return (
    <div className="admin-form-container glass-panel">
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

        <div style={{ display: 'flex', gap: '1.5rem' }}>
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
          disabled={mutation.isPending}
          style={{ background: 'var(--accent-crimson)', marginTop: '1rem' }}
        >
          {mutation.isPending ? 'Uploading Data...' : 'Commit Case to Database'}
        </button>
      </form>
    </div>
  );
}