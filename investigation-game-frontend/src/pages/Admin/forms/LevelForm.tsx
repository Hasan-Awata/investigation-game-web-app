import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminLevel, updateAdminLevel, deleteAdminLevel, fetchAdminCases } from '@/services/adminApi';
import { getInvestigationRequestLabel } from '@/types';

export default function LevelForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [caseId, setCaseId] = useState('');
  const [phaseId, setPhaseId] = useState(''); 
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [orderIndex, setOrderIndex] = useState('1');
  const [image, setImage] = useState<File | null>(null);
  const [storeLocally, setStoreLocally] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isInitial, setIsInitial] = useState(true);
  const [presentationType, setPresentationType] = useState<string>('standard');
  const [requiredRequestId, setRequiredRequestId] = useState<string>('');   
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setDetails('');
    setOrderIndex('1');
    setIsInitial(true);
    setStoreLocally(false);
    setPresentationType('standard');
    setRequiredRequestId('');
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminLevel(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Level successfully added to the database.' });
      clearForm();
      // Auto-increment for the next level creation
      setOrderIndex((prev) => (parseInt(prev || '1') + 1).toString());
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminLevel(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Level successfully updated.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminLevel(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Level and associated media wiped completely.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const selectedCase = cases.find((c: any) => c.id.toString() === caseId);
  const availablePhases = selectedCase?.phases || [];
  const availableRequests = selectedCase?.investigation_requests || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData();
    formData.append('phase_id', phaseId);
    formData.append('title', title);
    formData.append('details', details);
    formData.append('order_index', orderIndex);
    formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('presentation_type', presentationType);
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (requiredRequestId) formData.append('required_request_id', requiredRequestId);
    if (image) formData.append('image', image);

    if (editingId) {
      updateMutation.mutate({ id: editingId, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (level: any, parentCaseId: number, parentPhaseId: number) => {
    setEditingId(level.id);
    setCaseId(parentCaseId.toString());
    setPhaseId(parentPhaseId.toString());
    setTitle(level.title);
    setDetails(level.details || '');
    setOrderIndex(level.order_index.toString());
    setIsInitial(!!level.is_initial);
    setPresentationType(level.presentation_type || 'standard');
    setRequiredRequestId(level.required_request_id?.toString() || '');
    
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (levelId: number, levelTitle: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete "${levelTitle}"? All nested questions and media will be wiped permanently.`)) {
      setFeedback(null);
      if (editingId === levelId) clearForm();
      deleteMutation.mutate(levelId);
    }
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* FORM SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: 0 }}>
            {editingId ? `// Editing Level ID: ${editingId}` : '// Initialize New Level'}
          </h3>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>
              Cancel Edit
            </button>
          )}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Case</label>
              <select className="admin-input" required value={caseId} onChange={(e) => { setCaseId(e.target.value); setPhaseId(''); }} disabled={isFetchingCases}>
                <option value="" disabled>-- Select a Case --</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Phase</label>
              <select className="admin-input" required value={phaseId} onChange={(e) => setPhaseId(e.target.value)} disabled={!caseId}>
                <option value="" disabled>-- Select a Phase --</option>
                {availablePhases.map((p: any) => <option key={p.id} value={p.id}>{p.order_index}: {p.title}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Phase Order Index</label>
              <input type="number" className="admin-input" min="1" required value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Presentation Format</label>
              <select className="admin-input" value={presentationType} onChange={(e) => setPresentationType(e.target.value)}>
                <option value="standard">Standard Investigation</option>
                <option value="interrogation">Suspect Interrogation</option>
                <option value="location">Location</option>
                <option value="wiretap">Communications Wiretap</option> 
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Required Combo (Gatekeeper)</label>
              <select className="admin-input" value={requiredRequestId} onChange={(e) => setRequiredRequestId(e.target.value)} disabled={!caseId}>
                <option value="">-- No Requirement --</option>
                {availableRequests.map((req: any) => (
                  <option key={req.id} value={req.id}>
                    REQ-{req.id}: {getInvestigationRequestLabel(req.request_type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="initial-level-toggle" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="initial-level-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Initial Phase:</strong> This phase is visible on the roadmap immediately. (Uncheck if it must be unlocked via a specific player choice).
            </label>
          </div>

          <div className="form-group">
            <label>Level Title</label>
            <input type="text" className="admin-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Level Details (Objectives)</label>
            <textarea className="admin-textarea" required value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Location / Background Image {editingId && '(Leave blank to keep existing)'}</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <strong>Optimal:</strong> 16:9 ratio (e.g., 1920x1080) for full-screen location sweeps. High contrast recommended. Max 4MB.
            </p>
            <input 
              type="file" className="admin-file-input" accept="image/*" 
              ref={fileInputRef} 
              onChange={(e) => setImage(e.target.files?.[0] || null)} 
            />
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
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Level' : 'Commit Level to Database'}
          </button>
        </form>
      </div>

      {/* MANAGE EXISTING LEVELS */}
      {selectedCase && availablePhases.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Manage Existing Levels</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {availablePhases.map((phase: any) => (
              <div key={`phase-group-${phase.id}`}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                  Phase: {phase.title}
                </h4>
                {(!phase.levels || phase.levels.length === 0) ? (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>No levels assigned to this phase.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {phase.levels.sort((a: any, b: any) => a.order_index - b.order_index).map((level: any) => (
                      <div key={level.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginRight: '1rem' }}>IDX: {level.order_index}</span>
                          <strong>{level.title}</strong>
                          <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({level.presentation_type})</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button type="button" onClick={() => handleEdit(level, selectedCase.id, phase.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                          <button type="button" onClick={() => handleDelete(level.id, level.title)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}