import { useState } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useObjectUrl } from '@/pages/Admin/hooks/useObjectUrl';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import { AdminInput, AdminTextarea, AdminCheckbox, AdminSelect } from '@/pages/Admin/components/AdminUI';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { validateCharacterForm } from '../utils/validators';
import { CharacterCharge, CharacterStatus, type Character } from '@/types';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

const initialFormState = { name: '', background: '', is_initial: true, is_guilty: false, charge: '', default_status: CharacterStatus.Available, store_locally: false };

export default function CharacterForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.characterForm;

  const [image, setImage] = useState<File | null>(null);
  const imagePreviewUrl = useObjectUrl(image);

  const {
    formData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, isProcessing
  } = useAdminForm({
    entityType: 'character',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: validateCharacterForm 
  });

  const onEdit = (character: Character) => {
    handleEditInit(character, (c) => ({
      name: c.name,
      background: c.background || '',
      is_initial: !!c.is_initial,
      is_guilty: !!c.is_guilty,
      charge: c.charge || '',
      default_status: CharacterStatus.Available,
      store_locally: false
    }));
    setImage(null);
  };

  const onClear = () => { clearForm(); setImage(null); };

  const contextMissing = !caseId || !selectedCase ? (
    <div className={`${adminDashboard['admin-form-container']} glass-panel ${adminForms['admin-missing-context']}`}>
      <h3>{t.missingContextTitle}</h3><p>{t.missingContextDesc}</p>
    </div>
  ) : null;

  const submitLabel = {
    creating: t.commitCharacter,
    editing: t.updateCharacter,
    processing: t.processingData
  };

  return (
    <EntityDashboard<Character>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase?.characters || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={`CASE: ${selectedCase?.title || ''}`} keyExtractor={(c) => c.id}
      onClear={onClear} onEdit={onEdit} onDelete={(c) => handleDelete(c.id, t.deleteConfirm(c.name))}
      renderItemContent={(c) => (
        <>
          <span className={`${adminForms['admin-list-id']} ${c.is_guilty ? adminForms['admin-list-guilty'] : ''}`}>PID-{c.id.toString().padStart(4, '0')}</span>
          <strong>{c.name}</strong>
          {c.default_status === 'deceased' && <span className={adminForms['admin-list-badge']} style={{ color: 'var(--accent-crimson)', borderColor: 'var(--accent-crimson)' }}>Deceased</span>}
        </>
      )}
      contextMissing={contextMissing}
      submitLabel={submitLabel}
    >
      <form id="admin-entity-form" onSubmit={(e) => handleSubmit(e, { image })} className={adminDashboard['admin-form']}>
        <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialCharacterLabel} description={t.initialCharacterDesc} className={adminForms['status-live']} />
        <AdminCheckbox checked={formData.is_guilty} onChange={(e) => updateField('is_guilty', e.target.checked)} labelTitle={t.guiltyVerdictLabel} description={t.guiltyVerdictDesc} className={adminForms['status-draft']} />
        
        <div className={adminDashboard['admin-form-row']}>
          <AdminInput label={t.nameLabel} required value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
          <AdminSelect 
            label={t.defaultStatusLabel} 
            value={formData.default_status} 
            onChange={(e) => updateField('default_status', e.target.value)} 
            options={Object.values(CharacterStatus).map(s => ({ value: s, label: s.toUpperCase() }))} 
          />
        </div>

        {formData.is_guilty && (
          <AdminSelect 
            label={t.chargeLabel} 
            value={formData.charge} 
            onChange={(e) => updateField('charge', e.target.value)} 
            options={[{ value: '', label: '-- None --' }, ...Object.values(CharacterCharge).map(c => ({ value: c, label: c.toUpperCase() }))]} 
          />
        )}

<AdminTextarea label={t.backgroundLabel} value={formData.background} onChange={(e) => updateField('background', e.target.value)} />
        <MediaUploader label="Mugshot Photo" hint={t.imageHint} accept="image/*" previewUrl={imagePreviewUrl} onChange={setImage} />
        <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} className={adminForms['amber']} />
      </form>
    </EntityDashboard>
  );
}
