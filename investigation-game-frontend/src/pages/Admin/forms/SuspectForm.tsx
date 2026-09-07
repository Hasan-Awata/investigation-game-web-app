import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { AdminInput, AdminTextarea, AdminCheckbox, AdminFileInput, AdminEntryToggle, JsonPopulator } from '@/pages/Admin/components/AdminUI';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { validateSuspectForm, validateImageSize } from '../utils/validators';
import type { Suspect } from '@/types';
import './Shared/AdminForms.css';

const initialFormState = { name: '', background: '', is_initial: true, is_guilty: false, store_locally: false };

export default function SuspectForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.suspectForm;

  const [image, setImage] = useState<File | null>(null);

  const [entryMode, setEntryMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');

  const handleJsonPopulate = (parsed: any) => {
    if (parsed.name) updateField('name', parsed.name);
    if (parsed.background) updateField('background', parsed.background);
    if (typeof parsed.is_initial !== 'undefined') updateField('is_initial', parsed.is_initial);
    if (typeof parsed.is_guilty !== 'undefined') updateField('is_guilty', parsed.is_guilty);
    if (typeof parsed.store_locally !== 'undefined') updateField('store_locally', parsed.store_locally);
    
    setEntryMode('form');
    setJsonInput('');
  };

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing
  } = useValidatedForm({
    entityType: 'suspect',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: validateSuspectForm 
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle}</h3><p>{t.missingContextDesc}</p>
      </div>
    );
  }

  const onEdit = (suspect: Suspect) => {
    handleEditInit(suspect, (s) => ({
      name: s.name, background: s.background || '', is_initial: !!s.is_initial, is_guilty: !!s.is_guilty, store_locally: !!s.store_locally
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

  const onClear = () => { clearForm(); setImage(null); };

  return (
    <EntityDashboard<Suspect>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase.suspects || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase.title)} keyExtractor={(s) => s.id}
      onClear={onClear} onEdit={onEdit} onDelete={(s) => handleDelete(s.id, t.deleteConfirm(s.name))}
      renderItemContent={(s) => (
        <>
          <span className={`admin-list-id ${s.is_guilty ? 'admin-list-guilty' : ''}`}>PID-{s.id.toString().padStart(4, '0')}</span>
          <strong>{s.name}</strong>
        </>
      )}
    >
      <form onSubmit={(e) => handleValidatedSubmit(e, { image })} className="admin-form">
        <AdminEntryToggle mode={entryMode} setMode={setEntryMode} />

        {entryMode === 'form' ? (
          <>
            <AdminCheckbox checked={formData.is_guilty} onChange={(e) => updateField('is_guilty', e.target.checked)} labelTitle={t.guiltyVerdictLabel} description={t.guiltyVerdictDesc} className="status-draft" />
            <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialSuspectLabel} description={t.initialSuspectDesc} className="status-live" />
            <AdminInput label={t.nameLabel} required value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
            <AdminTextarea label={t.backgroundLabel} value={formData.background} onChange={(e) => updateField('background', e.target.value)} />
            <AdminFileInput label={`${t.mugshotLabel} ${editingId ? t.mugshotEditSuffix : ''}`} hint={t.mugshotHint} accept="image/*" ref={registerFileRef('image')} onChange={handleImageChange} />
            <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} description={t.storeLocallyDesc} className="amber" />
          </>
        ) : (
          <JsonPopulator 
            jsonInput={jsonInput} 
            setJsonInput={setJsonInput} 
            onPopulate={handleJsonPopulate} 
            requiredFields={['name']}
            template={{ name: "", background: "", is_initial: true, is_guilty: false, store_locally: false }}
          />
        )}

        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing || entryMode === 'json'}>
          {isProcessing ? t.processingData : editingId ? t.updateSuspect : t.commitSuspect}
        </button>
      </form>
    </EntityDashboard>
  );
}