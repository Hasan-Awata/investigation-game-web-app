import { useState, useEffect } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { AdminInput, AdminTextarea, CoordinatePicker } from '@/pages/Admin/components/AdminUI';
import type { Zone } from '@/types';
import { validateZoneForm } from '@/pages/Admin/utils/validators';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

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
    formData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, isProcessing
  } = useAdminForm({
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
  }, [editingId, availableZones, updateField]);

  const onClear = () => {
    clearForm();
    setIsTargeting(false);
  };

  const contextMissing = !caseId || !selectedCase ? (
    <div className={`${adminDashboard['admin-form-container']} glass-panel ${adminForms['admin-missing-context']}`}>
      <h3>{t.missingContextTitle}</h3>
      <p>{t.missingContextDesc}</p>
    </div>
  ) : null;

  const submitLabel = {
    creating: t.commitZone,
    editing: t.updateZone,
    processing: t.processingData
  };

  const caseMapUrl = selectedCase?.map_url;

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
      entityName={t.entityName}
      listTitle={t.manageTitle(selectedCase?.title || '')}
      items={availableZones}
      editingId={editingId}
      isProcessing={isProcessing}
      emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase?.title || '')}
      keyExtractor={(z) => z.id.toString()}
      onClear={onClear}
      onEdit={onEdit}
      onDelete={(z) => handleDelete(z.id, t.deleteConfirm(z.title))}
      renderItemContent={(z) => (
        <>
          <span className={adminForms['admin-list-id']}>IDX: {z.order_index}</span>
          <strong>{z.title}</strong>
          {z.coord_x && z.coord_y && <span className={adminForms['admin-list-badge']}>📍 {z.coord_x}%, {z.coord_y}%</span>}
        </>
      )}
      contextMissing={contextMissing}
      submitLabel={submitLabel}
    >
      <form onSubmit={handleSubmit} className={adminDashboard['admin-form']}>
        <AdminInput label={t.titleLabel} type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminTextarea label={t.descriptionLabel} style={{ minHeight: '100px' }} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

        {caseMapUrl ? (
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <CoordinatePicker
              imageUrl={caseMapUrl}
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
        ) : (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 179, 0, 0.1)', border: '1px dashed var(--accent-amber)', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              A map must be assigned to the current Case in the Case Form before coordinates can be plotted for this zone.
            </p>
          </div>
        )}
      </form>
    </EntityDashboard>
  );
}