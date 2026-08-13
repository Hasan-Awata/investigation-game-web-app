import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import { getInvestigationRequestLabel } from '@/types';
import EntityList from './Shared/EntityList';
import type { Evidence, Level, InvestigationRequest, InvestigationRequestType } from '@/types';

export default function InvestigationRequestForm() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<InvestigationRequestType | string>('search_warrant');
  const [requiredEvidenceIds, setRequiredEvidenceIds] = useState<string[]>([]);
  const [unlocksEvidenceId, setUnlocksEvidenceId] = useState<string>('');
  const [unlocksLevelId, setUnlocksLevelId] = useState<string>('');

  const { caseId, selectedCase } = useAdminContext();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback, setFeedback, clearFeedback 
  } = useAdminMutations('request');

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to map Procedural Combos.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null);
    setRequestType('search_warrant');
    setRequiredEvidenceIds([]); setUnlocksEvidenceId(''); setUnlocksLevelId('');
    clearFeedback();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    
    if (requiredEvidenceIds.length < 2) return setFeedback({ type: 'error', message: 'At least two pieces of evidence are required to build a combo.' });
    if (!unlocksEvidenceId && !unlocksLevelId) return setFeedback({ type: 'error', message: 'The request must yield at least one reward (Evidence or Level).' });

    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('request_type', requestType);
    if (unlocksEvidenceId) formData.append('unlocks_evidence_id', unlocksEvidenceId);
    if (unlocksLevelId) formData.append('unlocks_level_id', unlocksLevelId);
    
    requiredEvidenceIds.forEach(id => {
      formData.append('required_evidence_ids[]', id);
    });

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEdit = (req: InvestigationRequest) => {
    setEditingId(req.id);
    setRequestType(req.request_type);
    setRequiredEvidenceIds(req.required_evidences?.map((ev: Evidence) => ev.id.toString()) || []);
    setUnlocksEvidenceId(req.unlocks_evidence_id?.toString() || '');
    setUnlocksLevelId(req.unlocks_level_id?.toString() || '');
    clearFeedback();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (req: InvestigationRequest) => {
    if (window.confirm(`Are you sure you want to delete this ${getInvestigationRequestLabel(req.request_type)} protocol?`)) {
      if (editingId === req.id) clearForm();
      deleteEntity(req.id);
    }
  };

  const allCaseLevels: Level[] = selectedCase.phases?.flatMap(p => p.levels || []) || [];

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `// Editing Request ID: ${editingId}` : '// Compile New Request Protocol'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Targeting Case: {selectedCase.title}</span>
          </div>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
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

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ color: 'var(--accent-amber)' }}>[ THE PUZZLE ] Required Evidence Combination</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Players must submit ALL selected evidence items in the tray to get approval. (Hold Ctrl/Cmd to multi-select).
            </p>
            <select 
              multiple className="admin-input" style={{ height: '120px', padding: '0.5rem', borderColor: 'var(--accent-amber)' }} 
              value={requiredEvidenceIds} onChange={(e) => setRequiredEvidenceIds(Array.from(e.target.selectedOptions, opt => opt.value))}
            >
              {selectedCase.evidences?.map((ev: Evidence) => (
                <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-row" style={{ marginTop: '1.5rem', background: 'rgba(0, 229, 255, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ color: 'var(--accent-cyan)' }}>[ THE REWARD ] Unlocks Evidence</label>
              <select className="admin-input" value={unlocksEvidenceId} onChange={(e) => setUnlocksEvidenceId(e.target.value)}>
                <option value="">-- No Evidence Reward --</option>
                {selectedCase.evidences?.filter(ev => !ev.is_initial).map((ev: Evidence) => (
                  <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ color: 'var(--accent-cyan)' }}>[ THE REWARD ] Unlocks Phase/Level</label>
              <select className="admin-input" value={unlocksLevelId} onChange={(e) => setUnlocksLevelId(e.target.value)}>
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

      <EntityList<InvestigationRequest>
        title="Active Request Protocols"
        items={selectedCase.investigation_requests || []}
        emptyMessage="No request protocols built for this case."
        keyExtractor={(req) => req.id}
        isProcessing={isProcessing}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItemContent={(req) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginRight: '1rem', textTransform: 'uppercase' }}>REQ-{req.id}</span>
            <strong>{getInvestigationRequestLabel(req.request_type)}</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Requires {req.required_evidences?.length || 0} items
              {(req.unlocks_evidence_id || req.unlocks_level_id) && ' • 🎁 Has Reward'}
            </div>
          </>
        )}
      />
    </div>
  );
}