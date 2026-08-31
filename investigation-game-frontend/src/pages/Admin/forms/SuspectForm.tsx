import React, { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminForm } from '@/hooks/useAdminForm';
import AdminFormLayout from '@/components/AdminFormLayout';
import EntityList from './Shared/EntityList';
import { AdminInput, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/components/AdminUI';
import { validateImageSize } from '@/utils/fileValidation';
import type { Suspect } from '@/types';

const initialFormState = {
  name: '',
  background: '',
  is_initial: true,
  is_guilty: false,
  store_locally: false
};

export default function SuspectForm() {
  const { caseId, selectedCase } = useAdminContext();
  const [image, setImage] = useState<File | null>(null);

  const {
    formData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, registerFileRef, isProcessing, feedback
  } = useAdminForm({
    entityType: 'suspect',
    initialState: initialFormState,
    basePayload: { case_id: caseId }
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to manage Suspects.</p>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => handleSubmit(e, { image });

  const onEdit = (suspect: Suspect) => {
    handleEditInit(suspect, (s) => ({
      name: s.name,
      background: s.background || '',
      is_initial: !!s.is_initial,
      is_guilty: !!s.is_guilty,
      store_locally: !!s.store_locally
    }));
    setImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageSize(file)) {
      setImage(file);
    } else {
      setImage(null);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <AdminFormLayout editingId={editingId} entityName="Suspect" contextHeader={`Targeting Case: ${selectedCase.title}`} feedback={feedback} onCancel={clearForm}>
        <form onSubmit={onSubmit} className="admin-form">
          <AdminCheckbox
            checked={formData.is_guilty}
            onChange={(e) => updateField('is_guilty', e.target.checked)}
            labelTitle="Guilty Verdict"
            description="This individual is one of the actual perpetrators required to solve the case."
            accentColor="var(--accent-crimson)"
            bgColor="rgba(163,50,50,0.1)"
          />

          <AdminCheckbox
            checked={formData.is_initial}
            onChange={(e) => updateField('is_initial', e.target.checked)}
            labelTitle="Initial Suspect"
            description="Available on the board immediately when the case starts."
            accentColor="var(--accent-cyan)"
            bgColor="rgba(0,0,0,0.2)"
          />

          <AdminInput label="Full Name / Alias" required value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
          <AdminTextarea label="Background Intel" value={formData.background} onChange={(e) => updateField('background', e.target.value)} />
          
          <AdminFileInput
            label={`Mugshot ${editingId ? '(Leave blank to keep existing)' : ''}`}
            hint="Optimal: 1:1 (Square) ratio. Face centered. Min 400x400px. WEBP or JPG. Max 4MB."
            accept="image/*"
            ref={registerFileRef('image')}
            onChange={handleImageChange}
          />

          <AdminCheckbox
            checked={formData.store_locally}
            onChange={(e) => updateField('store_locally', e.target.checked)}
            labelTitle="Store Locally on Server"
            description="Save assets directly to public server folders instead of Cloudinary."
            accentColor="var(--accent-amber)"
          />

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Suspect' : 'Commit Suspect to Database'}
          </button>
        </form>
      </AdminFormLayout>

      <EntityList<Suspect>
        title="Case Suspects"
        items={selectedCase.suspects || []}
        emptyMessage="No suspects filed for this case."
        keyExtractor={(s) => s.id}
        isProcessing={isProcessing}
        onEdit={onEdit}
        onDelete={(s) => handleDelete(s.id, `Are you absolutely sure you want to delete ${s.name}?`)}
        renderItemContent={(s) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: s.is_guilty ? 'var(--accent-crimson)' : 'var(--text-secondary)', marginRight: '1rem' }}>
              PID-{s.id.toString().padStart(4, '0')}
            </span>
            <strong>{s.name}</strong>
          </>
        )}
      />
    </div>
  );
}