import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  createAdminInvestigationRequest, 
  updateAdminInvestigationRequest, 
  deleteAdminInvestigationRequest, 
  fetchAdminCases 
} from '@/services/adminApi';
import { getInvestigationRequestLabel } from '@/types';
import type { GameCase, Evidence, Level, InvestigationRequest, InvestigationRequestType } from '@/types';

export default function InvestigationRequestForm() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const [caseId, setCaseId] = useState('');
  const [requestType, setRequestType] = useState<InvestigationRequestType | string>('search_warrant');
  
  // The Combination (What the player submits)
  const [requiredEvidenceIds, setRequiredEvidenceIds] = useState<string[]>([]);
  
  // The Rewards (What the player gets if approved)
  const [unlocksEvidenceId, setUnlocksEvidenceId] = useState<string>('');
  const [unlocksLevelId, setUnlocksLevelId] = useState<string>('');
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    setRequestType('search_warrant');
    setRequiredEvidenceIds([]);
    setUnlocksEvidenceId('');
    setUnlocksLevelId('');
  };

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminInvestigationRequest(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setStatusMessage({ type: 'success', message: 'Procedural Request mapped successfully.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setStatusMessage({ type: 'error', message: error.message })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number, formData: FormData }) => {
      const result = await updateAdminInvestigationRequest(id, formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setStatusMessage({ type: 'success', message: 'Procedural Request updated.' });
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setStatusMessage({ type: 'error', message: error.message })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminInvestigationRequest(id);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setStatusMessage({ type: 'success', message: 'Request protocol wiped from database.' });
      queryClient.invalidateQueries({ queryKey: ['adminCases'] });
    },
    onError: (error: Error) => setStatusMessage({ type: 'error', message: error.message })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    
    if (!caseId) return setStatusMessage({ type: 'error', message: 'Target case is required.' });
    if (requiredEvidenceIds.length < 2) return setStatusMessage({ type: 'error', message: 'At least two pieces of evidence are required to build a combo.' });
    if (!unlocksEvidenceId && !unlocksLevelId) return setStatusMessage({ type: 'error', message: 'The request must yield at least one reward (Evidence or Level).' });

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('request_type', requestType);
    
    if (unlocksEvidenceId) formData.append('unlocks_evidence_id', unlocksEvidenceId);
    if (unlocksLevelId) formData.append('unlocks_level_id', unlocksLevelId);
    
    // Append the array strictly as required_evidence_ids[] for the backend controller
    requiredEvidenceIds.forEach(id => {
      formData.append('required_evidence_ids[]', id);
    });

    if (editingId) updateMutation.mutate({ id: editingId, formData });
    else createMutation.mutate(formData);
  };

  const handleEdit = (req: InvestigationRequest, parentCaseId: number) => {
    setEditingId(req.id);
    setCaseId(parentCaseId.toString());
    setRequestType(req.request_type);
    
    // Map the relational objects back to their raw IDs
    setRequiredEvidenceIds(req.required_evidences?.map((ev: Evidence) => ev.id.toString()) || []);
    
    setUnlocksEvidenceId(req.unlocks_evidence_id?.toString() || '');
    setUnlocksLevelId(req.unlocks_level_id?.toString() || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (reqId: number, reqType: string) => {
    if (window.confirm(`Are you sure you want to delete this ${getInvestigationRequestLabel(reqType)} protocol?`)) {
      setStatusMessage(null);
      if (editingId === reqId) clearForm();
      deleteMutation.mutate(reqId);
    }
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const selectedCase = cases.find((c: GameCase) => c.id.toString() === caseId);

  // Flatten all levels in the case for the unlocks dropdown
  const allCaseLevels: Level[] = selectedCase?.phases?.flatMap(p => p.levels || []) || [];

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: 0 }}>
            {editingId ? `// Editing Request ID: ${editingId}` : '// Compile New Request Protocol'}
          </h3>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {statusMessage && <div className={`status-message ${statusMessage.type}`}>{statusMessage.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Case</label>
              <select className="admin-input" required value={caseId} onChange={(e) => { setCaseId(e.target.value); clearForm(); }} disabled={isFetchingCases}>
                <option value="" disabled>-- Select a Case --</option>
                {cases.map((c: GameCase) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Request Category</label>
              <select className="admin-input" required value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                <option value="search_warrant">{getInvestigationRequestLabel('search_warrant')}</option>
                <option value="financial_subpoena">{getInvestigationRequestLabel('financial_subpoena')}</option>
                <option value="toxicology_report">{getInvestigationRequestLabel('toxicology_report')}</option>
                <option value="wiretap_authorization">{getInvestigationRequestLabel('wiretap_authorization')}</option>
                <option value="ballistics_analysis">{getInvestigationRequestLabel('ballistics_analysis')}</option>
                <option value="digital_forensics">{getInvestigationRequestLabel('digital_forensics')}</option>
                <option value="exhumation_order">{getInvestigationRequestLabel('exhumation_order')}</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ color: 'var(--accent-amber)' }}>[ THE PUZZLE ] Required Evidence Combination</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Players must submit ALL selected evidence items in the tray to get approval. (Hold Ctrl/Cmd to multi-select).
            </p>
            <select 
              multiple 
              className="admin-input" 
              style={{ height: '120px', padding: '0.5rem', borderColor: 'var(--accent-amber)' }} 
              value={requiredEvidenceIds} 
              onChange={(e) => setRequiredEvidenceIds(Array.from(e.target.selectedOptions, opt => opt.value))}
              disabled={!caseId}
            >
              {selectedCase?.evidences?.map((ev: Evidence) => (
                <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-row" style={{ marginTop: '1.5rem', background: 'rgba(0, 229, 255, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ color: 'var(--accent-cyan)' }}>[ THE REWARD ] Unlocks Evidence</label>
              <select className="admin-input" value={unlocksEvidenceId} onChange={(e) => setUnlocksEvidenceId(e.target.value)} disabled={!caseId}>
                <option value="">-- No Evidence Reward --</option>
                {selectedCase?.evidences?.filter(ev => !ev.is_initial).map((ev: Evidence) => (
                  <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ color: 'var(--accent-cyan)' }}>[ THE REWARD ] Unlocks Phase/Level</label>
              <select className="admin-input" value={unlocksLevelId} onChange={(e) => setUnlocksLevelId(e.target.value)} disabled={!caseId}>
                <option value="">-- No Level Reward --</option>
                {allCaseLevels.filter(l => !l.is_initial).map((l: Level) => (
                  <option key={l.id} value={l.id.toString()}>Level {l.order_index} : {l.title}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '1.5rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Protocol' : 'Commit Protocol to Database'}
          </button>
        </form>
      </div>

      {selectedCase && selectedCase.investigation_requests && selectedCase.investigation_requests.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', marginBottom: '1.5rem' }}>// Active Request Protocols</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedCase.investigation_requests.map((req: InvestigationRequest) => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginRight: '1rem', textTransform: 'uppercase' }}>REQ-{req.id}</span>
                  <strong>{getInvestigationRequestLabel(req.request_type)}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Requires {req.required_evidences?.length || 0} items
                    {(req.unlocks_evidence_id || req.unlocks_level_id) && ' • 🎁 Has Reward'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => handleEdit(req, selectedCase.id)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Edit</button>
                  <button type="button" onClick={() => handleDelete(req.id, req.request_type)} disabled={isProcessing} style={{ background: 'transparent', border: '1px solid var(--accent-crimson)', color: 'var(--accent-crimson)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}