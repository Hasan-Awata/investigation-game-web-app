import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { getInvestigationRequestLabel } from '@/types';
import type { Evidence, Level, InvestigationRequest } from '@/types';
import { AdminSelect } from '@/pages/Admin/components/AdminUI';
import { validateInvestigationRequestForm } from '@/pages/Admin/utils/validators';
import './Shared/AdminForms.css';

const initialFormState = { request_type: 'search_warrant', required_evidence_ids: [] as string[], unlocks_evidence_id: '', unlocks_level_id: '' };

export default function InvestigationRequestForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.investigationRequestForm;

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, isProcessing
  } = useValidatedForm({
    entityType: 'request',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: (data) => validateInvestigationRequestForm(
      data, 
      t.minTwoEvidenceAlert, 
      t.rewardRequiredAlert
    )
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle}</h3><p>{t.missingContextDesc}</p>
      </div>
    );
  }

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
    <EntityDashboard<InvestigationRequest>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase.investigation_requests || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase.title)} keyExtractor={(req) => req.id}
      onClear={clearForm} onEdit={onEdit} onDelete={(req) => handleDelete(req.id, t.deleteConfirm(getInvestigationRequestLabel(req.request_type)))}
      renderItemContent={(req) => (
        <>
          <span className="admin-list-id cyan">REQ-{req.id}</span>
          <strong>{getInvestigationRequestLabel(req.request_type)}</strong>
          <div className="admin-list-meta">
            {t.requiresCount(req.required_evidences?.length || 0)}
            {(req.unlocks_evidence_id || req.unlocks_level_id) && ` ${t.hasReward}`}
          </div>
        </>
      )}
    >
      <form onSubmit={handleValidatedSubmit} className="admin-form">
        <AdminSelect label={t.requestCategoryLabel} required value={formData.request_type} onChange={(e) => updateField('request_type', e.target.value)} options={[
          { value: 'search_warrant', label: getInvestigationRequestLabel('search_warrant') },
          { value: 'financial_subpoena', label: getInvestigationRequestLabel('financial_subpoena') },
          { value: 'toxicology_report', label: getInvestigationRequestLabel('toxicology_report') },
          { value: 'wiretap_authorization', label: getInvestigationRequestLabel('wiretap_authorization') },
          { value: 'ballistics_analysis', label: getInvestigationRequestLabel('ballistics_analysis') },
          { value: 'digital_forensics', label: getInvestigationRequestLabel('digital_forensics') },
          { value: 'exhumation_order', label: getInvestigationRequestLabel('exhumation_order') }
        ]} />

        <div className="form-group admin-multiselect-group">
          <label className="admin-multiselect-label">{t.puzzleHeader}</label>
          <p className="admin-multiselect-hint">{t.puzzleHint}</p>
          <select multiple className="admin-input admin-multiselect-box" value={formData.required_evidence_ids} onChange={(e) => updateField('required_evidence_ids', Array.from(e.target.selectedOptions, opt => opt.value))}>
            {selectedCase.evidences?.map((ev: Evidence) => (
              <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
            ))}
          </select>
        </div>

        <div className="admin-form-row admin-reward-container">
          <AdminSelect label={t.rewardEvidenceLabel} value={formData.unlocks_evidence_id} onChange={(e) => updateField('unlocks_evidence_id', e.target.value)} options={[{ value: '', label: t.noEvidenceReward }, ...(selectedCase.evidences?.filter((ev: Evidence) => !ev.is_initial).map((ev: Evidence) => ({ value: ev.id.toString(), label: `EX-${ev.id.toString().padStart(3, '0')} : ${ev.title}` })) || [])]} />
          <AdminSelect label={t.rewardLevelLabel} value={formData.unlocks_level_id} onChange={(e) => updateField('unlocks_level_id', e.target.value)} options={[{ value: '', label: t.noLevelReward }, ...allCaseLevels.filter(l => !l.is_initial).map((l: Level) => ({ value: l.id.toString(), label: `Level ${l.order_index} : ${l.title}` }))] } />
        </div>

        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'cyan-accent creating'}`} disabled={isProcessing}>
          {isProcessing ? t.processingData : editingId ? t.updateProtocol : t.commitProtocol}
        </button>
      </form>
    </EntityDashboard>
  );
}