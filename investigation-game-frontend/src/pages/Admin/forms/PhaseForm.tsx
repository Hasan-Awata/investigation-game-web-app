import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { AdminInput, AdminTextarea } from '@/pages/Admin/components/AdminUI';
import type { Phase } from '@/types';
import { validatePhaseForm } from '@/pages/Admin/utils/validators';
import './Shared/AdminForms.css';

const initialFormState = { title: '', description: '', order_index: '1' };

export default function PhaseForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.phaseForm;

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit, 
    handleEditInit, handleDelete, isProcessing
  } = useValidatedForm({
      entityType: 'phase',
      initialState: initialFormState,
      basePayload: { case_id: caseId },
      validator: validatePhaseForm
    });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle}</h3>
        <p>{t.missingContextDesc}</p>
      </div>
    );
  }

  const onEdit = (phase: Phase) => {
    handleEditInit(phase, (p) => ({
      title: p.title,
      description: p.description || '',
      order_index: p.order_index.toString()
    }));
  };

  return (
    <EntityDashboard<Phase>
      entityName={t.entityName}
      listTitle={t.manageTitle(selectedCase.title)}
      items={selectedCase.phases || []}
      editingId={editingId}
      isProcessing={isProcessing}
      emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase.title)}
      keyExtractor={(p) => p.id}
      onClear={clearForm}
      onEdit={onEdit}
      onDelete={(p) => handleDelete(p.id, t.deleteConfirm(p.title))}
      renderItemContent={(p) => (
        <>
          <span className="admin-list-id">IDX: {p.order_index}</span>
          <strong>{p.title}</strong>
        </>
      )}
    >
      <form onSubmit={handleValidatedSubmit} className="admin-form">
        <AdminInput label={t.orderIndexLabel} type="number" min="1" required value={formData.order_index} onChange={(e) => updateField('order_index', e.target.value)} />
        <AdminInput label={t.titleLabel} type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminTextarea label={t.descriptionLabel} style={{ minHeight: '100px' }} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
        
        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing}>
          {isProcessing ? t.processingData : editingId ? t.updatePhase : t.commitPhase}
        </button>
      </form>
    </EntityDashboard>
  );
}