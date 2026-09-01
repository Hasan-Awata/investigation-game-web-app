import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { AdminInput, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/pages/Admin/components/AdminUI';
import { validateVictimForm, validateImageSize } from '../utils/validators';
import type { Victim } from '@/types';
import './Shared/AdminForms.css';

const initialFormState = { name: '', background: '', is_initial: true, store_locally: false };

export default function VictimForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.victimForm;

  const [image, setImage] = useState<File | null>(null);

  const {
    formData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing
  } = useValidatedForm({
    entityType: 'victim',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: validateVictimForm 
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle}</h3>
        <p>{t.missingContextDesc}</p>
      </div>
    );
  }

  const onEdit = (victim: Victim) => {
    handleEditInit(victim, (v) => ({ name: v.name, background: v.background || '', is_initial: !!v.is_initial, store_locally: false }));
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
    <EntityDashboard<Victim>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase.victims || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase.title)} keyExtractor={(v) => v.id}
      onClear={onClear} onEdit={onEdit} onDelete={(v) => handleDelete(v.id, t.deleteConfirm(v.name))}
      renderItemContent={(v) => (
        <>
          <span className="admin-list-id">VIC-{v.id.toString().padStart(4, '0')}</span>
          <strong>{v.name}</strong>
        </>
      )}
    >
      <form onSubmit={(e) => handleValidatedSubmit(e, { image })} className="admin-form">
        <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialVictimLabel} description={t.initialVictimDesc} className="status-live" />
        <AdminInput label={t.nameLabel} required value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
        <AdminTextarea label={t.backgroundLabel} value={formData.background} onChange={(e) => updateField('background', e.target.value)} />
        <AdminFileInput label={`${t.victimImageLabel} ${editingId ? t.victimImageEditSuffix : ''}`} hint={t.victimImageHint} accept="image/*" ref={registerFileRef('image')} onChange={handleImageChange} />
        <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} className="amber" />
        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing}>
          {isProcessing ? t.processingData : editingId ? t.updateVictim : t.commitVictim}
        </button>
      </form>
    </EntityDashboard>
  );
}