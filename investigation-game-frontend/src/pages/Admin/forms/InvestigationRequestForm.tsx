import React from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminForm } from '@/hooks/useAdminForm';
import AdminFormLayout from '@/components/AdminFormLayout';
import EntityList from './Shared/EntityList';
import { getInvestigationRequestLabel } from '@/types';
import type { Evidence, Level, InvestigationRequest } from '@/types';
import { AdminSelect } from '@/components/AdminUI';

const initialFormState = {
  request_type: 'search_warrant',
  required_evidence_ids: [] as string[],
  unlocks_evidence_id: '',
  unlocks_level_id: ''
};

export default function InvestigationRequestForm() {
  const { caseId, selectedCase } = useAdminContext();

  const {
    formData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, isProcessing, feedback
  } = useAdminForm({
    entityType: 'request',
    initialState: initialFormState,
    basePayload: { case_id: caseId }
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to map Procedural Combos.</p>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Optional client-side validation before passing to the generic handler
    if (formData.required_evidence_ids.length < 2) {
      e.preventDefault();
      alert('At least two pieces of evidence are required to build a combo.');
      return;
    }
    if (!formData.unlocks_evidence_id && !formData.unlocks_level_id) {
      e.preventDefault();
      alert('The request must yield at least one reward (Evidence or Level).');
      return;
    }
    handleSubmit(e);
  };

  const onEdit = (req: InvestigationRequest) => {
    handleEditInit(req, (r) => ({
      request_type: r.request_type,
      required_evidence_ids: r.required_evidences?.map((ev: Evidence) => ev.id.toString()) || [],
      unlocks_evidence_id: r.unlocks_evidence_id?.toString() || '',
      unlocks_level_id: r.unlocks_level_id?.toString() || ''
    }));
  };

  const allCaseLevels: Level[] = selectedCase.phases?.flatMap(p => p.levels || []) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <AdminFormLayout editingId={editingId} entityName="Request Protocol" contextHeader={`Targeting Case: ${selectedCase.title}`} feedback={feedback} onCancel={clearForm}>
        <form onSubmit={onSubmit} className="admin-form">
          
          <AdminSelect 
            label="Request Category" 
            required 
            value={formData.request_type} 
            onChange={(e) => updateField('request_type', e.target.value)}
            options={[
              { value: 'search_warrant', label: getInvestigationRequestLabel('search_warrant') },
              { value: 'financial_subpoena', label: getInvestigationRequestLabel('financial_subpoena') },
              { value: 'toxicology_report', label: getInvestigationRequestLabel('toxicology_report') },
              { value: 'wiretap_authorization', label: getInvestigationRequestLabel('wiretap_authorization') },
              { value: 'ballistics_analysis', label: getInvestigationRequestLabel('ballistics_analysis') },
              { value: 'digital_forensics', label: getInvestigationRequestLabel('digital_forensics') },
              { value: 'exhumation_order', label: getInvestigationRequestLabel('exhumation_order') }
            ]} 
          />

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ color: 'var(--accent-amber)' }}>[ THE PUZZLE ] Required Evidence Combination</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Players must submit ALL selected evidence items in the tray to get approval. (Hold Ctrl/Cmd to multi-select).
            </p>
            <select
              multiple className="admin-input" style={{ height: '120px', padding: '0.5rem', borderColor: 'var(--accent-amber)' }}
              value={formData.required_evidence_ids} 
              onChange={(e) => updateField('required_evidence_ids', Array.from(e.target.selectedOptions, opt => opt.value))}
            >
              {selectedCase.evidences?.map((ev: Evidence) => (
                <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-row" style={{ marginTop: '1.5rem', background: 'rgba(0, 229, 255, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            <AdminSelect 
              label="[ THE REWARD ] Unlocks Evidence" 
              value={formData.unlocks_evidence_id} 
              onChange={(e) => updateField('unlocks_evidence_id', e.target.value)}
              options={[
                { value: '', label: '-- No Evidence Reward --' },
                ...(selectedCase.evidences?.filter(ev => !ev.is_initial).map((ev: Evidence) => ({
                  value: ev.id.toString(), label: `EX-${ev.id.toString().padStart(3, '0')} : ${ev.title}`
                })) || [])
              ]}
            />
            
            <AdminSelect 
              label="[ THE REWARD ] Unlocks Phase/Level" 
              value={formData.unlocks_level_id} 
              onChange={(e) => updateField('unlocks_level_id', e.target.value)}
              options={[
                { value: '', label: '-- No Level Reward --' },
                ...allCaseLevels.filter(l => !l.is_initial).map((l: Level) => ({
                  value: l.id.toString(), label: `Level ${l.order_index} : ${l.title}`
                }))
              ]}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-cyan)', color: 'var(--bg-dark)', marginTop: '1.5rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Protocol' : 'Commit Protocol to Database'}
          </button>
        </form>
      </AdminFormLayout>

      <EntityList<InvestigationRequest>
        title="Active Request Protocols" items={selectedCase.investigation_requests || []} emptyMessage="No request protocols built for this case."
        keyExtractor={(req) => req.id} isProcessing={isProcessing} onEdit={onEdit} onDelete={(req) => handleDelete(req.id, `Are you sure you want to delete this ${getInvestigationRequestLabel(req.request_type)} protocol?`)}
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