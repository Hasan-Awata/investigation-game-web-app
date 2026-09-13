import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import AdminFormLayout from '@/pages/Admin/components/AdminFormLayout';
import EntityList from './Shared/EntityList';
import { getInvestigationRequestLabel } from '@/types';
import type { Level, Zone } from '@/types';
import { AdminRow, AdminInput, AdminSelect, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/pages/Admin/components/AdminUI';
import { validateLevelForm, validateImageSize } from '../utils/validators';
import './Shared/AdminForms.css';

const initialFormState = { zone_id: '', title: '', details: '', order_index: '1', store_locally: false, is_initial: true, presentation_type: 'interrogation', required_request_id: '' };

export default function LevelForm() {
  const { caseId, zoneId, selectedCase, availableZones } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.levelForm;

  const [image, setImage] = useState<File | null>(null);

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing
  } = useValidatedForm({
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
  }, [zoneId, editingId]);

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle || 'Missing Context'}</h3>
        <p>Please select a Case from the sidebar to manage its Levels.</p>
      </div>
    );
  }

  const availableRequests = (selectedCase as any)?.investigation_requests || [];
  const requestOptions = [{ value: '', label: t.noRequirementOption }, ...availableRequests.map((req: any) => ({ value: req.id.toString(), label: `REQ-${req.id}: ${getInvestigationRequestLabel(req.request_type)}` }))];

  const onEdit = (level: Level, parentZoneId: number) => {
    handleEditInit(level, (l) => ({
      zone_id: parentZoneId.toString(),
      title: l.title, details: l.details || '', order_index: l.order_index.toString(), is_initial: !!l.is_initial, presentation_type: l.presentation_type || 'interrogation', required_request_id: (l as any).required_request_id?.toString() || '', store_locally: false
    }));
    setImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      return;
    }
    
    const error = validateImageSize(file);
    if (!error) { 
      setImage(file); 
    } else { 
      toast.error(error);
      setImage(null); 
      e.target.value = ''; 
    }
  };

  return (
    <div className="admin-form-page">
      <AdminFormLayout editingId={editingId} entityName={t.entityName} contextHeader={`Targeting Case: ${selectedCase.title}`} onCancel={clearForm}>
        <form onSubmit={(e) => handleValidatedSubmit(e, { image })} className="admin-form">
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
            <AdminSelect label={t.presentationFormatLabel} value={formData.presentation_type} onChange={(e) => updateField('presentation_type', e.target.value)} options={[{ value: 'interrogation', label: t.interrogationOption }, { value: 'location', label: t.locationOption }, { value: 'wiretap', label: t.wiretapOption }]} />
            <AdminSelect label={t.gatekeeperLabel} value={formData.required_request_id} onChange={(e) => updateField('required_request_id', e.target.value)} options={requestOptions} />
          </AdminRow>
          
          <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialLevelLabel || 'INITIAL LEAD'} description={t.initialLevelDesc || 'Visible by default'} className="status-live" />
          <AdminInput label={t.levelTitleLabel} type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
          <AdminTextarea label={t.levelDetailsLabel} required value={formData.details} onChange={(e) => updateField('details', e.target.value)} />
          <AdminFileInput label={`${t.bgImageLabel} ${editingId ? t.bgImageEditSuffix : ''}`} hint={t.bgImageHint} accept="image/*" ref={registerFileRef('image')} onChange={handleImageChange} />
          <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} description={t.storeLocallyDesc} className="amber" />
          
          <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing}>
            {isProcessing ? t.processingData : editingId ? t.updateLevel : t.commitLevel}
          </button>
        </form>
      </AdminFormLayout>

      {availableZones.length > 0 && (
        <div className="admin-stack-group">
          {availableZones.map((zone: Zone) => (
            <EntityList<Level>
              key={`zone-group-${zone.id}`} 
              title={t.zoneLevelsTitle ? t.zoneLevelsTitle(zone.title) : `Levels in Zone: ${zone.title}`} 
              items={[...(zone.levels || [])].sort((a, b) => a.order_index - b.order_index)}
              emptyMessage={t.emptyMessage} 
              keyExtractor={(level) => level.id.toString()} 
              isProcessing={isProcessing}
              onEdit={(level) => onEdit(level, zone.id)} 
              onDelete={(level) => handleDelete(level.id, t.deleteConfirm(level.title))}
              renderItemContent={(level) => (
                <><span className="admin-list-id cyan">IDX: {level.order_index}</span><strong>{level.title}</strong><span className="admin-list-badge">({level.presentation_type})</span></>
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}