import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { getInvestigationRequestLabel, InvestigationRequestType } from '@/types';
import type { Character, Evidence, Level, InvestigationRequest } from '@/types';
import { AdminSelect } from '@/pages/Admin/components/AdminUI';
import { validateInvestigationRequestForm } from '@/pages/Admin/utils/validators';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

const initialFormState = { request_type: 'search_warrant', required_evidence_ids: [] as string[], required_character_ids: [] as string[], unlocks_evidence_id: '', unlocks_level_id: '' };

export default function InvestigationRequestForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.investigationRequestForm;

  const {
    formData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, isProcessing
  } = useAdminForm({
    entityType: 'request',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: (data) => validateInvestigationRequestForm(
      data, 
      t.minTwoEvidenceAlert, 
      t.rewardRequiredAlert
    )
  });

  const onEdit = (req: InvestigationRequest) => {
    handleEditInit(req, (r) => ({
      request_type: r.request_type,
      required_evidence_ids: r.required_evidences?.map((ev: Evidence) => ev.id.toString()) || [],
      required_character_ids: r.required_characters?.map((c: Character) => c.id.toString()) || [],
      unlocks_evidence_id: r.unlocks_evidence_id?.toString() || '',
      unlocks_level_id: r.unlocks_level_id?.toString() || ''
    }));
  };

  const allCaseLevels: Level[] = selectedCase?.zones?.flatMap(p => p.levels || []) || [];

  const contextMissing = !caseId || !selectedCase ? (
    <div className={`${adminDashboard['admin-form-container']} glass-panel ${adminForms['admin-missing-context']}`}>
      <h3>{t.missingContextTitle}</h3><p>{t.missingContextDesc}</p>
    </div>
  ) : null;

  const submitLabel = {
    creating: t.commitProtocol,
    editing: t.updateProtocol,
    processing: t.processingData
  };

  return (
    <EntityDashboard<InvestigationRequest>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase?.investigation_requests || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase?.title || '')} keyExtractor={(req) => req.id}
      onClear={clearForm} onEdit={onEdit} onDelete={(req) => handleDelete(req.id, t.deleteConfirm(getInvestigationRequestLabel(req.request_type)))}
      renderItemContent={(req) => (
        <>
          <span className={`${adminForms['admin-list-id']} ${adminForms['cyan']}`}>REQ-{req.id}</span>
          <strong>{getInvestigationRequestLabel(req.request_type)}</strong>
          <div className={adminForms['admin-list-meta']}>
            {t.requiresCount((req.required_evidences?.length || 0) + (req.required_characters?.length || 0))}
            {(req.unlocks_evidence_id || req.unlocks_level_id) && ` ${t.hasReward}`}
          </div>
        </>
      )}
      contextMissing={contextMissing}
      submitLabel={submitLabel}
    >
      <form id="admin-entity-form" onSubmit={handleSubmit} className={adminDashboard['admin-form']}>
        <AdminSelect label={t.requestCategoryLabel} required value={formData.request_type} onChange={(e) => updateField('request_type', e.target.value)} options={
          Object.values(InvestigationRequestType).map(type => ({
            value: type,
            label: getInvestigationRequestLabel(type)
          }))
        } />

        <div className={`${adminDashboard['form-group']} ${adminForms['admin-multiselect-group']}`}>
          <label className={adminForms['admin-multiselect-label']}>{t.puzzleHeader}</label>
          <p className={adminForms['admin-multiselect-hint']}>{t.puzzleHint}</p>
          <select multiple className={`${adminDashboard['admin-input']} ${adminForms['admin-multiselect-box']}`} value={formData.required_evidence_ids} onChange={(e) => updateField('required_evidence_ids', Array.from(e.target.selectedOptions, opt => opt.value))}>
            {selectedCase?.evidences?.map((ev: Evidence) => (
              <option key={ev.id} value={ev.id.toString()}>EX-{ev.id.toString().padStart(3, '0')} : {ev.title}</option>
            ))}
          </select>
        </div>

        <div className={`${adminDashboard['form-group']} ${adminForms['admin-multiselect-group']}`}>
          <label className={adminForms['admin-multiselect-label']}>{t.charactersHeader}</label>
          <p className={adminForms['admin-multiselect-hint']}>{t.charactersHint}</p>
          <select multiple className={`${adminDashboard['admin-input']} ${adminForms['admin-multiselect-box']}`} value={formData.required_character_ids} onChange={(e) => updateField('required_character_ids', Array.from(e.target.selectedOptions, opt => opt.value))}>
            {selectedCase?.characters?.map((character: Character) => (
              <option key={character.id} value={character.id.toString()}>CH-{character.id.toString().padStart(3, '0')} : {character.name}</option>
            ))}
          </select>
        </div>

<div className={`${adminDashboard['admin-form-row']} ${adminForms['admin-reward-container']}`}>
          <AdminSelect label={t.rewardEvidenceLabel} value={formData.unlocks_evidence_id} onChange={(e) => updateField('unlocks_evidence_id', e.target.value)} options={[{ value: '', label: t.noEvidenceReward }, ...(selectedCase?.evidences?.filter((ev: Evidence) => !ev.is_initial).map((ev: Evidence) => ({ value: ev.id.toString(), label: `EX-${ev.id.toString().padStart(3, '0')} : ${ev.title}` })) || [])]} />
          <AdminSelect label={t.rewardLevelLabel} value={formData.unlocks_level_id} onChange={(e) => updateField('unlocks_level_id', e.target.value)} options={[{ value: '', label: t.noLevelReward }, ...allCaseLevels.filter(l => !l.is_initial).map((l: Level) => ({ value: l.id.toString(), label: `Level ${l.order_index} : ${l.title}` }))] } />
        </div>
      </form>
    </EntityDashboard>
  );
}
