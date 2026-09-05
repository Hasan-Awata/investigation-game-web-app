import { useState } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { AdminInput, AdminTextarea, AdminSelect, CoordinatePicker } from '@/pages/Admin/components/AdminUI';
import type { Phase } from '@/types';
import { validatePhaseForm } from '@/pages/Admin/utils/validators';
import './Shared/AdminForms.css';
import './QuestionForm/AdminLocationBuilder.css'; 

const AVAILABLE_MAPS = [
  { value: '', label: '-- None --' },
  { value: '/tactical-damascus-blueprint.png', label: 'Tactical Damascus Blueprint' }
];

const initialFormState = { 
  title: '', 
  description: '', 
  order_index: '1',
  map_url: '',
  coord_x: '',
  coord_y: ''
};

export default function PhaseForm() {
  const { caseId, selectedCase, availablePhases } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.phaseForm;
  
  const [isTargeting, setIsTargeting] = useState(false);

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
      order_index: p.order_index.toString(),
      map_url: p.map_url || '',
      coord_x: p.coord_x?.toString() || '',
      coord_y: p.coord_y?.toString() || ''
    }));
    setIsTargeting(false);
  };

  const onClear = () => {
    clearForm();
    setIsTargeting(false);
  };

  const handleCoordinateSelect = (x: string, y: string) => {
    updateField('coord_x', x);
    updateField('coord_y', y);
    setIsTargeting(false);
  };

  const currentMarker = formData.coord_x && formData.coord_y ? [{
    id: 'phase_marker',
    x: formData.coord_x,
    y: formData.coord_y,
    isTargeting: true
  }] : [];

  return (
    <EntityDashboard<Phase>
      entityName={t.entityName}
      listTitle={t.manageTitle(selectedCase.title)}
      items={availablePhases}
      editingId={editingId}
      isProcessing={isProcessing}
      emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase.title)}
      keyExtractor={(p) => p.id}
      onClear={onClear}
      onEdit={onEdit}
      onDelete={(p) => handleDelete(p.id, t.deleteConfirm(p.title))}
      renderItemContent={(p) => (
        <>
          <span className="admin-list-id">IDX: {p.order_index}</span>
          <strong>{p.title}</strong>
          {p.map_url && <span className="admin-list-badge">📍 {p.coord_x}%, {p.coord_y}%</span>}
        </>
      )}
    >
      <form onSubmit={handleValidatedSubmit} className="admin-form">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <AdminInput label={t.orderIndexLabel} type="number" min="1" required value={formData.order_index} onChange={(e) => updateField('order_index', e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
             <AdminSelect 
                label={t.mapUrlLabel} 
                value={formData.map_url} 
                onChange={(e) => {
                  updateField('map_url', e.target.value);
                  if (!e.target.value) {
                    updateField('coord_x', '');
                    updateField('coord_y', '');
                    setIsTargeting(false);
                  }
                }} 
                options={AVAILABLE_MAPS} 
              />
          </div>
        </div>
        
        <AdminInput label={t.titleLabel} type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminTextarea label={t.descriptionLabel} style={{ minHeight: '100px' }} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

        {formData.map_url && (
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <CoordinatePicker
              imageUrl={formData.map_url}
              isTargeting={isTargeting}
              targetingBannerText={t.targetingBanner}
              cancelTargetBtnText={t.cancelTargetBtn}
              onCancelTargeting={() => setIsTargeting(false)}
              onCoordinateSelect={handleCoordinateSelect}
              markers={currentMarker}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {t.coordinateLabel} {formData.coord_x ? `${formData.coord_x}%, ${formData.coord_y}%` : 'N/A'}
              </span>
              <button 
                type="button" 
                onClick={() => setIsTargeting(true)} 
                className="btn-secondary" 
                style={{ padding: '0.5rem 1rem', width: 'auto' }}
              >
                {t.mapCoordinateBtn}
              </button>
            </div>
          </div>
        )}

        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing}>
          {isProcessing ? t.processingData : editingId ? t.updatePhase : t.commitPhase}
        </button>
      </form>
    </EntityDashboard>
  );
}