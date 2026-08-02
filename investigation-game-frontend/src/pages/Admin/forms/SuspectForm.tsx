import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminSuspect, fetchAdminCases } from '@/services/adminApi';

export default function SuspectForm() {
  const [caseId, setCaseId] = useState('');
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [isInitial, setIsInitial] = useState(true);
  const [isGuilty, setIsGuilty] = useState(false); 
  const [image, setImage] = useState<File | null>(null);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
      const result = await createAdminSuspect(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Suspect profile filed successfully.' });
      setName('');
      setBackground('');
      setIsInitial(true);
      setImage(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
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
    formData.append('name', name);
    formData.append('background', background);
    formData.append('is_initial', isInitial ? '1' : '0');
    if (image) formData.append('image', image);

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
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label>Target Case</label>
          <select 
            className="admin-input" required
            value={caseId} 
            onChange={(e) => setCaseId(e.target.value)} 
            disabled={isFetchingCases}
          >
            <option value="" disabled>-- Select a Case --</option>
            {cases.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163,50,50,0.1)', border: '1px solid rgba(163,50,50,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <input 
            type="checkbox" id="suspect-guilty-toggle"
            checked={isGuilty} onChange={(e) => setIsGuilty(e.target.checked)}
            style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-crimson)' }}
          />
          <label htmlFor="suspect-guilty-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', cursor: 'pointer' }}>
            <strong>Guilty Verdict:</strong> This individual is one of the actual perpetrators required to solve the case.
          </label>
        </div>

        <div className="form-group">
          <label>Full Name / Alias</label>
          <input 
            type="text" className="admin-input" required
            value={name} onChange={(e) => setName(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Background Intel (Optional)</label>
          <textarea 
            className="admin-textarea"
            value={background} onChange={(e) => setBackground(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Mugshot / Photo (Optional)</label>
          <input 
            type="file" className="admin-file-input" accept="image/*"
            ref={imageInputRef}
            onChange={(e) => setImage(e.target.files?.[0] || null)} 
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={mutation.isPending}
          style={{ background: 'var(--accent-crimson)', marginTop: '1rem' }}
        >
          {mutation.isPending ? 'Encrypting Data...' : 'Commit Suspect to Database'}
        </button>
      </form>
    </div>
  );
}