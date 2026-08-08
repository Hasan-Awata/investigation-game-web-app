import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminEvidence, updateAdminEvidence, deleteAdminEvidence, fetchAdminCases } from '@/services/adminApi';
import type { EvidenceType } from '@/types';

export default function EvidenceForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paragraph, setParagraph] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  const [isInitial, setIsInitial] = useState(true);
  const [isVitalForConviction, setIsVitalForConviction] = useState(false);
  
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: cases = [], isLoading: isFetchingCases } = useQuery({
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
    setParagraph('');
    setIsInitial(true);
    setIsVitalForConviction(false);
    setImage(null);
    setAudio(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminEvidence(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Evidence secured in database.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminEvidence(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Evidence updated.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminEvidence(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Evidence deleted.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!caseId) return setFeedback({ type: 'error', message: 'Select a target case.' });

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('title', title);
    formData.append('evidence_type', evidenceType);
    formData.append('description', description);
    formData.append('paragraph', paragraph);
    formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('is_vital_for_conviction', isVitalForConviction ? '1' : '0');
    
    if (evidenceType === 'image' && image) formData.append('image', image);
    if (evidenceType === 'audio' && audio) formData.append('audio', audio);

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (ev: any, parentCaseId: number) => {
    setEditingId(ev.id);
    setCaseId(parentCaseId.toString());
    setTitle(ev.title);
    setDescription(ev.description || '');
    setParagraph(ev.paragraph || '');
    setEvidenceType(ev.evidence_type);
    setIsInitial(!!ev.is_initial);
    setIsVitalForConviction(!!ev.is_vital_for_conviction);
    setImage(null);
    setAudio(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (evId: number, evTitle: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete "${evTitle}"?`)) {
      setFeedback(null);
      if (editingId === evId) clearForm();
      deleteMutation.mutate(evId);
    }
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const selectedCase = cases.find((c: any) => c.id.toString() === caseId);

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: 0 }}>
            {editingId ? `// Editing Evidence ID: ${editingId}` : '// Initialize New Evidence'}
          </h3>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Target Case</label>
            <select className="admin-input" required value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={isFetchingCases}>
              <option value="" disabled>-- Select a Case --</option>
              {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="initial-toggle" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="initial-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}><strong>Initial Evidence:</strong> Available on the board immediately.</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163,50,50,0.1)', border: '1px solid rgba(163,50,50,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="vital-toggle" checked={isVitalForConviction} onChange={(e) => setIsVitalForConviction(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-crimson)' }} />
            <label htmlFor="vital-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', cursor: 'pointer' }}><strong>Vital Evidence:</strong> Required to secure a conviction.</label>
          </div>

          <div className="form-group">
            <label>Evidence Category</label>
            <select className="admin-input" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}>
              <option value="document">Written Document</option>
              <option value="testimony">Witness Testimony</option>
              <option value="audio">Audio Recording</option>
              <option value="image">Photographic Evidence</option>
              <option value="forensic">Forensic Report</option>
            </select>
          </div>

          <div className="form-group"><label>Evidence Title</label><input type="text" className="admin-input" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="form-group"><label>Short Description</label><input type="text" className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="form-group"><label>Text Content (Markdown)</label><textarea className="admin-textarea" value={paragraph} onChange={(e) => setParagraph(e.target.value)} /></div>

          {evidenceType === 'image' && <div className="form-group"><label>Evidence Image</label><input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>}
          {evidenceType === 'audio' && <div className="form-group"><label>Audio Recording</label><input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} /></div>}

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Evidence' : 'Commit Evidence'}
          </button>
        </form>
      </div>

      {selectedCase && selectedCase.evidences && selectedCase.evidences.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Case Evidence</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedCase.evidences.map((ev: any) => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>EX-{ev.id.toString().padStart(3, '0')}</span>
                  <strong>{ev.title}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => handleEdit(ev, selectedCase.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                  <button type="button" onClick={() => handleDelete(ev.id, ev.title)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}