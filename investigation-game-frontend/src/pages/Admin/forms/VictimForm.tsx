import { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminForm } from '@/hooks/useAdminForm';
import AdminFormLayout from '@/components/AdminFormLayout';
import EntityList from './Shared/EntityList';
import { AdminInput, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/components/AdminUI';
import type { Victim } from '@/types';

const initialFormState = { name: '', background: '', is_initial: true, store_locally: false };

export default function VictimForm() {
  const { caseId, selectedCase } = useAdminContext();
  const [image, setImage] = useState<File | null>(null);

  const {
    formData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing, feedback
  } = useAdminForm({
    entityType: 'victim',
    initialState: initialFormState,
    basePayload: { caseId }
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to manage Victims.</p>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => handleSubmit(e, { image });

  const onEdit = (victim: Victim) => {
    handleEditInit(victim, (v) => ({ name: v.name, background: v.background || '', is_initial: !!v.is_initial, store_locally: false }));
    setImage(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <AdminFormLayout editingId={editingId} entityName="Casualty" contextHeader={`Targeting Case: ${selectedCase.title}`} feedback={feedback} onCancel={clearForm}>
        <form onSubmit={onSubmit} className="admin-form">
          <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle="Initial Victim" description="Details available immediately when the case starts." accentColor="var(--accent-cyan)" bgColor="rgba(0,0,0,0.2)" />
          
          <AdminInput label="Full Name / Alias" required value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
          <AdminTextarea label="Background Intel / Autopsy Notes" value={formData.background} onChange={(e) => updateField('background', e.target.value)} />
          
          <AdminFileInput label={`Victim Image ${editingId ? '(Leave blank to keep existing)' : ''}`} hint="Optimal: 1:1 ratio. Min 400x400px. WEBP or JPG. Max 4MB." accept="image/*" ref={registerFileRef('image')} onChange={(e) => setImage(e.target.files?.[0] || null)} />
          <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle="Store Locally on Server" accentColor="var(--accent-amber)" />

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Victim' : 'Commit Victim to Database'}
          </button>
        </form>
      </AdminFormLayout>

      <EntityList<Victim>
        title="Identified Casualties" items={selectedCase.victims || []} emptyMessage="No casualties identified for this case."
        keyExtractor={(v) => v.id} isProcessing={isProcessing} onEdit={onEdit} onDelete={(v) => handleDelete(v.id, `Delete ${v.name}?`)}
        renderItemContent={(v) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>VIC-{v.id.toString().padStart(4, '0')}</span>
            <strong>{v.name}</strong>
          </>
        )}
      />
    </div>
  );
}