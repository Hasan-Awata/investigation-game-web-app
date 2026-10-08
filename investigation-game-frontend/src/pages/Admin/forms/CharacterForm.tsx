import { useState } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import { AdminInput, AdminTextarea, AdminCheckbox, AdminSelect, AdminEntryToggle, JsonPopulator } from '@/pages/Admin/components/AdminUI';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { validateCharacterForm } from '../utils/validators';
import { CharacterCharge, CharacterStatus, type Character } from '@/types';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

const initialFormState = { name: '', background: '', is_initial: true, is_guilty: false, charge: '', default_status: CharacterStatus.Available, store_locally: false };

export default function CharacterForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.characterForm || { 
    entityName: 'Character', manageTitle: 'Manage Roster', emptyMessage: 'No characters found.',
    initialCharacterLabel: 'Initial Discovery', initialCharacterDesc: 'Unlocked at case start',
    guiltyVerdictLabel: 'Guilty', guiltyVerdictDesc: 'Target is flagged as guilty',
    nameLabel: 'Full Name', backgroundLabel: 'Background Intel', defaultStatusLabel: 'Initial Status',
    chargeLabel: 'Criminal Charge', imageHint: 'Max 4MB', storeLocallyLabel: 'Store Locally',
    processingData: 'Processing...', commitCharacter: 'Commit Character', updateCharacter: 'Update Record',
    deleteConfirm: (n: string) => `Delete ${n}?`
  };

  const [image, setImage] = useState<File | null>(null);
  const [entryMode, setEntryMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');

  const handleJsonPopulate = (parsed: unknown) => {
    const p = parsed as Record<string, unknown>;
    if (p.name) updateField('name', String(p.name));
    if (p.background) updateField('background', String(p.background));
    if (typeof p.is_initial !== 'undefined') updateField('is_initial', Boolean(p.is_initial));
    if (typeof p.is_guilty !== 'undefined') updateField('is_guilty', Boolean(p.is_guilty));
    if (p.charge) updateField('charge', String(p.charge));
    if (p.default_status) updateField('default_status', String(p.default_status));
    if (typeof p.store_locally !== 'undefined') updateField('store_locally', Boolean(p.store_locally));
    
    setEntryMode('form');
    setJsonInput('');
  };

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
      <h3>{t.missingContextTitle || 'Context Missing'}</h3><p>{t.missingContextDesc || 'Select a case first.'}</p>
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
      <form onSubmit={(e) => handleSubmit(e, { image })} className={adminDashboard['admin-form']}>
        <AdminEntryToggle mode={entryMode} setMode={setEntryMode} />

        {entryMode === 'form' ? (
          <>
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
            <MediaUploader label="Mugshot Photo" hint={t.imageHint} accept="image/*" previewUrl={image ? URL.createObjectURL(image) : null} onChange={setImage} />
            <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} className={adminForms['amber']} />
          </>
        ) : (
          <JsonPopulator 
            jsonInput={jsonInput} setJsonInput={setJsonInput} onPopulate={handleJsonPopulate} requiredFields={['name']}
            template={{ name: "", background: "", is_initial: true, is_guilty: false, default_status: "available", charge: "", store_locally: false }}
          />
        )}
      </form>
    </EntityDashboard>
  );
}