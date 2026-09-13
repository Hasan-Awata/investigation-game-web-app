import { useState, useEffect } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { AdminInput, AdminTextarea, CoordinatePicker } from '@/pages/Admin/components/AdminUI';
import type { Zone } from '@/types';
import { validateZoneForm } from '@/pages/Admin/utils/validators';
import './Shared/AdminForms.css';
import './QuestionForm/AdminLocationBuilder.css'; 

const initialFormState = { 
  title: '', 
  description: '', 
  order_index: '1',
  coord_x: '',
  coord_y: ''
};

export default function ZoneForm() {
  const { caseId, selectedCase, availableZones } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.zoneForm; 
  
  const [isTargeting, setIsTargeting] = useState(false);

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit,
    handleEditInit, handleDelete, isProcessing
  } = useValidatedForm({
      entityType: 'zone',
      initialState: initialFormState,
      basePayload: { case_id: caseId },
      validator: validateZoneForm
    });

  // Auto-calculate the next order_index in the background without prompting the user
  useEffect(() => {
    if (!editingId && availableZones) {
      const maxIndex = availableZones.length > 0 
        ? Math.max(...availableZones.map((z: Zone) => z.order_index || 0)) 
        : 0;
      updateField('order_index', (maxIndex + 1).toString());
    }
  }, [editingId, availableZones]);

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle || 'Missing Context'}</h3>
        <p>{t.missingContextDesc || 'Please select a Case from the sidebar to manage its Zones.'}</p>
      </div>
    );
  }

  const caseMapUrl = (selectedCase as any)?.map_url;

  const onEdit = (zone: Zone) => {
    handleEditInit(zone, (z) => ({
      title: z.title,
      description: z.description || '',
      order_index: z.order_index?.toString() || '1',
      coord_x: z.coord_x?.toString() || '',
      coord_y: z.coord_y?.toString() || ''
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
    id: 'zone_marker',
    x: formData.coord_x,
    y: formData.coord_y,
    isTargeting: true
  }] : [];

  return (
    <EntityDashboard<Zone>
      entityName={t.entityName || 'Zone'}
      listTitle={t.manageTitle ? t.manageTitle(selectedCase.title) : `Manage Zones: ${selectedCase.title}`}
      items={availableZones}
      editingId={editingId}
      isProcessing={isProcessing}
      emptyMessage={t.emptyMessage || 'No zones found.'}
      contextHeader={t.targetCaseHeader ? t.targetCaseHeader(selectedCase.title) : `Targeting Case: ${selectedCase.title}`}
      keyExtractor={(z) => z.id.toString()}
      onClear={onClear}
      onEdit={onEdit}
      onDelete={(z) => handleDelete(z.id, t.deleteConfirm ? t.deleteConfirm(z.title) : `Delete ${z.title}?`)}
      renderItemContent={(z) => (
        <>
          <span className="admin-list-id">IDX: {z.order_index}</span>
          <strong>{z.title}</strong>
          {z.coord_x && z.coord_y && <span className="admin-list-badge">📍 {z.coord_x}%, {z.coord_y}%</span>}
        </>
      )}
    >
      <form onSubmit={handleValidatedSubmit} className="admin-form">
        <AdminInput label={t.titleLabel || 'Zone Title'} type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminTextarea label={t.descriptionLabel || 'Zone Description'} style={{ minHeight: '100px' }} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

        {caseMapUrl ? (
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <CoordinatePicker
              imageUrl={caseMapUrl}
              isTargeting={isTargeting}
              targetingBannerText={t.targetingBanner || 'Click anywhere on the map to set coordinates'}
              cancelTargetBtnText={t.cancelTargetBtn || 'Cancel'}
              onCancelTargeting={() => setIsTargeting(false)}
              onCoordinateSelect={handleCoordinateSelect}
              markers={currentMarker}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {t.coordinateLabel || 'Coordinates:'} {formData.coord_x ? `${formData.coord_x}%, ${formData.coord_y}%` : 'N/A'}
              </span>
              <button 
                type="button" 
                onClick={() => setIsTargeting(true)} 
                className="btn-secondary" 
                style={{ padding: '0.5rem 1rem', width: 'auto' }}
              >
                {t.mapCoordinateBtn || 'Target Coordinates'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 179, 0, 0.1)', border: '1px dashed var(--accent-amber)', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              A map must be assigned to the current Case in the Case Form before coordinates can be plotted for this zone.
            </p>
          </div>
        )}

        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing}>
          {isProcessing ? (t.processingData || 'Processing...') : editingId ? (t.updateZone || 'UPDATE ZONE') : (t.commitZone || 'COMMIT ZONE')}
        </button>
      </form>
    </EntityDashboard>
  );
}