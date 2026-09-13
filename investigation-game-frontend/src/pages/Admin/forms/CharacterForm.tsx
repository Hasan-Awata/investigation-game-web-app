import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { AdminInput, AdminTextarea, AdminCheckbox, AdminSelect, AdminFileInput, AdminEntryToggle, JsonPopulator } from '@/pages/Admin/components/AdminUI';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { validateCharacterForm, validateImageSize } from '../utils/validators';
import { CharacterCharge, CharacterStatus, type Character } from '@/types';
import './Shared/AdminForms.css';

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

  const handleJsonPopulate = (parsed: any) => {
    if (parsed.name) updateField('name', parsed.name);
    if (parsed.background) updateField('background', parsed.background);
    if (typeof parsed.is_initial !== 'undefined') updateField('is_initial', parsed.is_initial);
    if (typeof parsed.is_guilty !== 'undefined') updateField('is_guilty', parsed.is_guilty);
    if (parsed.charge) updateField('charge', parsed.charge);
    if (parsed.default_status) updateField('default_status', parsed.default_status);
    if (typeof parsed.store_locally !== 'undefined') updateField('store_locally', parsed.store_locally);
    
    setEntryMode('form');
    setJsonInput('');
  };

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing
  } = useValidatedForm({
    entityType: 'character',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: validateCharacterForm 
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle || 'Context Missing'}</h3><p>{t.missingContextDesc || 'Select a case first.'}</p>
      </div>
    );
  }

  const onEdit = (character: Character) => {
    handleEditInit(character, (c) => ({
      name: c.name, background: c.background || '', is_initial: !!c.is_initial, is_guilty: !!c.is_guilty,
      charge: c.charge || '', default_status: c.default_status || CharacterStatus.Available, store_locally: false
    }));
    setImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setImage(null); return; }
    
    const error = validateImageSize(file);
    if (!error) { 
      setImage(file); 
    } else { 
      toast.error(error);
      setImage(null); 
      e.target.value = ''; 
    }
  };

  const onClear = () => { clearForm(); setImage(null); };

  return (
    <EntityDashboard<Character>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase.characters || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={`CASE: ${selectedCase.title}`} keyExtractor={(c) => c.id}
      onClear={onClear} onEdit={onEdit} onDelete={(c) => handleDelete(c.id, t.deleteConfirm(c.name))}
      renderItemContent={(c) => (
        <>
          <span className={`admin-list-id ${c.is_guilty ? 'admin-list-guilty' : ''}`}>PID-{c.id.toString().padStart(4, '0')}</span>
          <strong>{c.name}</strong>
          {c.default_status === 'deceased' && <span className="admin-list-badge" style={{ color: 'var(--accent-crimson)', borderColor: 'var(--accent-crimson)' }}>Deceased</span>}
        </>
      )}
    >
      <form onSubmit={(e) => handleValidatedSubmit(e, { image })} className="admin-form">
        <AdminEntryToggle mode={entryMode} setMode={setEntryMode} />

        {entryMode === 'form' ? (
          <>
            <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialCharacterLabel} description={t.initialCharacterDesc} className="status-live" />
            <AdminCheckbox checked={formData.is_guilty} onChange={(e) => updateField('is_guilty', e.target.checked)} labelTitle={t.guiltyVerdictLabel} description={t.guiltyVerdictDesc} className="status-draft" />
            
            <div className="admin-form-row">
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
            <AdminFileInput label="Mugshot Photo" hint={t.imageHint} accept="image/*" ref={registerFileRef('image')} onChange={handleImageChange} />
            <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} className="amber" />
          </>
        ) : (
          <JsonPopulator 
            jsonInput={jsonInput} setJsonInput={setJsonInput} onPopulate={handleJsonPopulate} requiredFields={['name']}
            template={{ name: "", background: "", is_initial: true, is_guilty: false, default_status: "available", charge: "", store_locally: false }}
          />
        )}

        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing || entryMode === 'json'}>
          {isProcessing ? t.processingData : editingId ? t.updateCharacter : t.commitCharacter}
        </button>
      </form>
    </EntityDashboard>
  );
}