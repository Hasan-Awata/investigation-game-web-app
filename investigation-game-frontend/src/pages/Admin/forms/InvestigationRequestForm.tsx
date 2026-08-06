import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAdminInvestigationRequest, fetchAdminCases } from '@/services/adminApi';
import { InvestigationRequestType, getInvestigationRequestLabel } from '@/types';

export default function InvestigationRequestForm() {
  const [caseId, setCaseId] = useState('');
  const [requestType, setRequestType] = useState<string>('');
  const [unlocksEvidenceId, setUnlocksEvidenceId] = useState('');
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

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createAdminInvestigationRequest(formData);
      if (!result.isSuccess) throw new Error(result.errorMessage);
      return result.value;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Investigation request successfully compiled.' });
      setRequestType('');
      setUnlocksEvidenceId('');
      setRequiredEvidenceIds([]);
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message });
    }
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
      setFeedback({ type: 'error', message: 'A procedural request must require at least two pieces of evidence to cross-reference.' });
      return;
    }

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('request_type', requestType);
    formData.append('unlocks_evidence_id', unlocksEvidenceId);
    
    requiredEvidenceIds.forEach(id => {
      formData.append('required_evidence_ids[]', id.toString());
    });

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
              value={caseId} 
              onChange={(e) => {
                setCaseId(e.target.value);
                setRequiredEvidenceIds([]);
                setUnlocksEvidenceId('');
              }} 
              disabled={isFetchingCases}
            >
              <option value="" disabled>-- Select a Case --</option>
              {cases.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ flex: 1 }}>
            <label>Request Classification</label>
            <select 
              className="admin-input" required
              value={requestType} 
              onChange={(e) => setRequestType(e.target.value)}
            >
              <option value="" disabled>-- Select Classification --</option>
              {Object.values(InvestigationRequestType).map(type => (
                <option key={type} value={type}>{getInvestigationRequestLabel(type)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label style={{ color: 'var(--accent-amber)' }}>Target Evidence to Unlock</label>
          <select 
            className="admin-input" required
            value={unlocksEvidenceId} 
            onChange={(e) => setUnlocksEvidenceId(e.target.value)}
            disabled={!caseId}
          >
            <option value="" disabled>-- Select the Reward Evidence --</option>
            {availableEvidences.map((ev: any) => (
              <option key={`unlock-${ev.id}`} value={ev.id}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
            ))}
          </select>
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
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      readOnly
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-cyan)' }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      EX-{ev.id.toString().padStart(3, '0')}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={mutation.isPending}
          style={{ background: 'var(--accent-crimson)', marginTop: '1rem' }}
        >
          {mutation.isPending ? 'Processing...' : 'Compile Investigation Request'}
        </button>
      </form>
    </div>
  );
}