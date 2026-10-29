import { useState, useEffect } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useObjectUrl } from '@/pages/Admin/hooks/useObjectUrl';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { getInvestigationRequestLabel } from '@/types';
import type { Level } from '@/types';
import { AdminRow, AdminInput, AdminSelect, AdminTextarea, AdminCheckbox } from '@/pages/Admin/components/AdminUI';
import { validateLevelForm } from '../utils/validators';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

const initialFormState = { zone_id: '', title: '', details: '', order_index: '1', store_locally: false, is_initial: true, presentation_type: 'interrogation', required_request_id: '' };

export default function LevelForm() {
  const { zoneId, selectedCase, availableZones } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.levelForm;

  const [image, setImage] = useState<File | null>(null);
  const imagePreviewUrl = useObjectUrl(image);

  const {
    formData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, isProcessing
  } = useAdminForm({
    entityType: 'level',
    initialState: initialFormState,
    basePayload: {}, // Removed zone_id, now handled dynamically by the form state
    validator: validateLevelForm
  });

  // Quality of Life: Auto-select the zone if the user *did* use the sidebar index
  useEffect(() => {
    if (!editingId && zoneId && formData.zone_id !== zoneId) {
      updateField('zone_id', zoneId);
    }
  }, [zoneId, editingId, formData.zone_id, updateField]);

  const availableRequests = selectedCase?.investigation_requests || [];
  const requestOptions = [{ value: '', label: t.noRequirementOption }, ...availableRequests.map((req) => ({ value: req.id.toString(), label: `REQ-${req.id}: ${getInvestigationRequestLabel(req.request_type)}` }))];

  const onEdit = (level: Level, parentZoneId: number) => {
    handleEditInit(level, (l) => ({
      zone_id: parentZoneId.toString(),
      title: l.title, details: l.details || '', order_index: l.order_index.toString(), is_initial: !!l.is_initial, presentation_type: l.presentation_type || 'interrogation', required_request_id: l.required_request_id?.toString() || '', store_locally: false
    }));
    setImage(null);
  };

  const onClear = () => { clearForm(); setImage(null); };

  return (
    <EntityDashboard<Level>
      entityName={t.entityName}
      listTitle={t.zoneLevelsTitle(selectedCase?.title || '')}
      items={availableZones.flatMap(z => z.levels || [])}
      editingId={editingId}
      isProcessing={isProcessing}
      emptyMessage={t.emptyMessage}
      contextHeader={`Targeting Case: ${selectedCase?.title || ''}`}
      keyExtractor={(level) => level.id.toString()}
      onClear={onClear}
      onEdit={(level) => onEdit(level, availableZones.find(z => z.levels?.some(l => l.id === level.id))?.id || 0)}
      onDelete={(level) => handleDelete(level.id, t.deleteConfirm(level.title))}
      renderItemContent={(level) => (
        <>
          <span className={`${adminForms['admin-list-id']} ${adminForms['cyan']}`}>IDX: {level.order_index}</span>
          <strong>{level.title}</strong>
          <span className={adminForms['admin-list-badge']}>({level.presentation_type})</span>
        </>
      )}
    >
      <form id="admin-entity-form" onSubmit={(e) => handleSubmit(e, { image })} className={adminDashboard['admin-form']}>
        <AdminRow>
          <AdminSelect 
            label="Target Zone" 
            required 
            value={formData.zone_id} 
            onChange={(e) => updateField('zone_id', e.target.value)} 
            options={[
              { value: '', label: '-- Select Zone --' }, 
              ...availableZones.map(z => ({ value: z.id.toString(), label: z.title }))
            ]} 
          />
          <AdminInput label={t.orderIndexLabel} type="number" min="1" required value={formData.order_index} onChange={(e) => updateField('order_index', e.target.value)} />
        </AdminRow>

        <AdminRow>
          <AdminSelect label={t.presentationFormatLabel} value={formData.presentation_type} onChange={(e) => updateField('presentation_type', e.target.value)} options={[{ value: 'interrogation', label: t.interrogationOption }, { value: 'location', label: t.locationOption }]} />
          <AdminSelect label={t.gatekeeperLabel} value={formData.required_request_id} onChange={(e) => updateField('required_request_id', e.target.value)} options={requestOptions} />
        </AdminRow>
        
        <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialLevelLabel} description={t.initialLevelDesc} className={adminForms['status-live']} />
        <AdminInput label={t.levelTitleLabel} type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminTextarea label={t.levelDetailsLabel} required value={formData.details} onChange={(e) => updateField('details', e.target.value)} />
        <MediaUploader label={`${t.bgImageLabel} ${editingId ? t.bgImageEditSuffix : ''}`} hint={t.bgImageHint} accept="image/*" previewUrl={imagePreviewUrl} onChange={setImage} />
        <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} description={t.storeLocallyDesc} className={adminForms['amber']} />
      </form>
    </EntityDashboard>
  );
}
