import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminSuspect, updateAdminSuspect, deleteAdminSuspect, fetchAdminCases } from '@/services/adminApi';
import type { GameCase, Suspect } from '@/types';

export default function SuspectForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [caseId, setCaseId] = useState('');
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [isInitial, setIsInitial] = useState(true);
  const [isGuilty, setIsGuilty] = useState(false); 
  const [storeLocally, setStoreLocally] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    setName('');
    setBackground('');
    setIsInitial(true);
    setIsGuilty(false);
    setStoreLocally(false);
    setImage(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminSuspect(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Suspect profile filed successfully.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminSuspect(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Suspect profile updated successfully.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminSuspect(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Suspect wiped from the database.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('name', name);
    formData.append('background', background);
    formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('is_guilty', isGuilty ? '1' : '0');
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (image) formData.append('image', image);

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  // STRICT TYPING: Applied Suspect interface
  const handleEdit = (suspect: Suspect, parentCaseId: number) => {
    setEditingId(suspect.id);
    setCaseId(parentCaseId.toString());
    setName(suspect.name);
    setBackground(suspect.background || '');
    setIsInitial(!!suspect.is_initial);
    setIsGuilty(!!suspect.is_guilty);
    setImage(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (suspectId: number, suspectName: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${suspectName}?`)) {
      setFeedback(null);
      if (editingId === suspectId) clearForm();
      deleteMutation.mutate(suspectId);
    }
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const selectedCase = cases.find((c: GameCase) => c.id.toString() === caseId);

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: 0 }}>
            {editingId ? `// Editing Suspect ID: ${editingId}` : '// Initialize New Suspect'}
          </h3>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Target Case</label>
            <select className="admin-input" required value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={isFetchingCases}>
              <option value="" disabled>-- Select a Case --</option>
              {cases.map((c: GameCase) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163,50,50,0.1)', border: '1px solid rgba(163,50,50,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="suspect-guilty-toggle" checked={isGuilty} onChange={(e) => setIsGuilty(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-crimson)' }} />
            <label htmlFor="suspect-guilty-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', cursor: 'pointer' }}>
              <strong>Guilty Verdict:</strong> This individual is one of the actual perpetrators required to solve the case.
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="suspect-initial-toggle" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="suspect-initial-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Initial Suspect:</strong> Available on the board immediately when the case starts.
            </label>
          </div>

          <div className="form-group"><label>Full Name / Alias</label><input type="text" className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="form-group"><label>Background Intel</label><textarea className="admin-textarea" value={background} onChange={(e) => setBackground(e.target.value)} /></div>
          <div className="form-group">
            <label>Mugshot {editingId && '(Leave blank to keep existing)'}</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <strong>Optimal:</strong> 1:1 (Square) ratio. Face centered. Min 400x400px. WEBP or JPG. Max 4MB.
            </p>
            <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginTop: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <input 
              type="checkbox" 
              id="store-locally-toggle" 
              checked={storeLocally} 
              onChange={(e) => setStoreLocally(e.target.checked)} 
              style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} 
            />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}>
              <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Suspect' : 'Commit Suspect to Database'}
          </button>
        </form>
      </div>

      {selectedCase && selectedCase.suspects && selectedCase.suspects.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Case Suspects</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedCase.suspects.map((s: Suspect) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: s.is_guilty ? 'var(--accent-crimson)' : 'var(--text-secondary)', marginRight: '1rem' }}>PID-{s.id.toString().padStart(4, '0')}</span>
                  <strong>{s.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => handleEdit(s, selectedCase.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                  <button type="button" onClick={() => handleDelete(s.id, s.name)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}