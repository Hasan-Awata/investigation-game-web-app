import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminLevel, fetchAdminCases } from '@/services/adminApi';

export default function LevelForm() {
  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [orderIndex, setOrderIndex] = useState('1');
  const [image, setImage] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isInitial, setIsInitial] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presentationType, setPresentationType] = useState<string>('standard');

  // Fetch cases for the dropdown
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
      const result = await createAdminLevel(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Level successfully added to the database.' });
      setTitle('');
      setDetails('');
      setOrderIndex((prev) => (parseInt(prev) + 1).toString());
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
    formData.append('case_id', caseId);
    formData.append('title', title);
    formData.append('details', details);
    formData.append('order_index', orderIndex);
    formData.append('is_initial', isInitial.toString());
    formData.append('presentation_type', presentationType);
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
        <div className="admin-form-row">
          
          <div className="form-group" style={{ flex: 1 }}>
            <label>Target Case</label>
            <select 
              className="admin-input" required
              value={caseId} onChange={(e) => setCaseId(e.target.value)} 
              disabled={isFetchingCases}
            >
              <option value="" disabled>-- Select a Case --</option>
              {cases.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ flex: 1 }}>
            <label>Phase Order Index</label>
            <input 
              type="number" className="admin-input" min="1" required
              value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} 
            />
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label>Presentation Format</label>
            <select 
              className="admin-input" 
              value={presentationType} 
              onChange={(e) => setPresentationType(e.target.value)} 
            >
              <option value="standard">Standard Investigation</option>
              <option value="interrogation">Suspect Interrogation</option>
            </select>
          </div>
          
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <input 
            type="checkbox" id="initial-level-toggle"
            checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)}
            style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }}
          />
          <label htmlFor="initial-level-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <strong>Initial Phase:</strong> This phase is visible on the roadmap immediately. (Uncheck if it must be unlocked via a specific player choice).
          </label>
        </div>

        <div className="form-group">
          <label>Level Title</label>
          <input 
            type="text" className="admin-input" required
            value={title} onChange={(e) => setTitle(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Level Details (Objectives)</label>
          <textarea 
            className="admin-textarea" required
            value={details} onChange={(e) => setDetails(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Location / Background Image (Optional)</label>
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
          {mutation.isPending ? 'Uploading Data...' : 'Commit Level to Database'}
        </button>
      </form>
    </div>
  );
}