import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminInvestigationRequest, updateAdminInvestigationRequest, deleteAdminInvestigationRequest, fetchAdminCases } from '@/services/adminApi';
import { InvestigationRequestType, getInvestigationRequestLabel } from '@/types';

export default function InvestigationRequestForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [caseId, setCaseId] = useState('');
  const [requestType, setRequestType] = useState<string>('');
  const [unlocksEvidenceId, setUnlocksEvidenceId] = useState('');
  const [unlocksLevelId, setUnlocksLevelId] = useState('');
  const [requiredEvidenceIds, setRequiredEvidenceIds] = useState<number[]>([]);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: cases = [], isLoading: isFetchingCases } = useQuery({
    queryKey: ['adminCases'],
    queryFn: async () => {
      const result = await fetchAdminCases();
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    }
  });

  const selectedCase = cases.find((c: any) => c.id.toString() === caseId);
  const availableEvidences = selectedCase?.evidences || [];
  const existingRequests = selectedCase?.investigation_requests || [];
  const availablePhases = selectedCase?.phases || [];

  const clearForm = () => {
    setEditingId(null);
    setRequestType('');
    setUnlocksEvidenceId('');
    setUnlocksLevelId('');
    setRequiredEvidenceIds([]);
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminInvestigationRequest(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Investigation request successfully compiled.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminInvestigationRequest(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Investigation request successfully updated.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminInvestigationRequest(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Investigation request deleted.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setFeedback({ type: 'error', message: error.message })
  });

  const handleToggleRequired = (id: number) => {
    setRequiredEvidenceIds(prev => 
      prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (requiredEvidenceIds.length < 2) {
      return setFeedback({ type: 'error', message: 'A procedural request must require at least two pieces of evidence to cross-reference.' });
    }

    if (!unlocksEvidenceId && !unlocksLevelId) {
       return setFeedback({ type: 'error', message: 'A request must unlock either a piece of evidence or a narrative level.' });
    }

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('request_type', requestType);
    if (unlocksEvidenceId) formData.append('unlocks_evidence_id', unlocksEvidenceId);
    if (unlocksLevelId) formData.append('unlocks_level_id', unlocksLevelId);
    requiredEvidenceIds.forEach(id => formData.append('required_evidence_ids[]', id.toString()));

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (req: any, parentCaseId: number) => {
    setEditingId(req.id);
    setCaseId(parentCaseId.toString());
    setRequestType(req.request_type);
    setUnlocksEvidenceId(req.unlocks_evidence_id?.toString() || '');
    setUnlocksLevelId(req.unlocks_level_id?.toString() || '');
    setRequiredEvidenceIds(req.required_evidences?.map((e: any) => e.id) || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (reqId: number) => {
    if (window.confirm("Are you absolutely sure you want to delete this investigation request combo?")) {
      setFeedback(null);
      if (editingId === reqId) clearForm();
      deleteMutation.mutate(reqId);
    }
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: 0 }}>
            {editingId ? `// Editing Request ID: ${editingId}` : '// Compile Investigation Request'}
          </h3>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Case</label>
              <select className="admin-input" required value={caseId} onChange={(e) => { setCaseId(e.target.value); clearForm(); }} disabled={isFetchingCases}>
                <option value="" disabled>-- Select a Case --</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Request Classification</label>
              <select className="admin-input" required value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                <option value="" disabled>-- Select Classification --</option>
                {Object.values(InvestigationRequestType).map(type => (
                  <option key={type} value={type}>{getInvestigationRequestLabel(type)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ color: 'var(--accent-amber)' }}>Target Evidence to Unlock</label>
              <select className="admin-input" value={unlocksEvidenceId} onChange={(e) => setUnlocksEvidenceId(e.target.value)} disabled={!caseId}>
                <option value="">-- No Evidence Unlock --</option> 
                {availableEvidences.map((ev: any) => (
                  <option key={`unlock-${ev.id}`} value={ev.id}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ color: 'var(--accent-cyan)' }}>Target Phase to Unlock</label>
              <select className="admin-input" value={unlocksLevelId} onChange={(e) => setUnlocksLevelId(e.target.value)} disabled={!caseId}>
                <option value="">-- No Phase Unlock --</option>
                {availablePhases.flatMap((p: any) => 
                  p.levels?.map((l: any) => (
                    <option key={l.id} value={l.id}>{p.title} - Lead {l.order_index}: {l.title}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
            <label style={{ marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Required Evidence Combination</label>
            
            {availableEvidences.length === 0 ? (
              <div className="terminal-text" style={{ padding: 0, textAlign: 'left' }}>No evidence available in this case.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {availableEvidences.map((ev: any) => {
                  const isSelected = requiredEvidenceIds.includes(ev.id);
                  return (
                    <div 
                      key={`req-${ev.id}`}
                      onClick={() => handleToggleRequired(ev.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', 
                        background: isSelected ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-cyan)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>EX-{ev.id.toString().padStart(3, '0')}</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Request Combo' : 'Compile Investigation Request'}
          </button>
        </form>
      </div>

      {/* MANAGE EXISTING REQUEST COMBOS */}
      {selectedCase && existingRequests.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Manage Existing Request Combos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {existingRequests.map((req: any) => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginRight: '1rem' }}>REQ-{req.id}</span>
                  <strong>{getInvestigationRequestLabel(req.request_type)}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Requires {req.required_evidences?.length || 0} evidence items
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => handleEdit(req, selectedCase.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                  <button type="button" onClick={() => handleDelete(req.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}