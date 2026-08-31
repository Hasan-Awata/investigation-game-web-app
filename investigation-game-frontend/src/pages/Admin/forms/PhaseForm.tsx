import React from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminForm } from '@/hooks/useAdminForm';
import AdminFormLayout from '@/components/AdminFormLayout';
import EntityList from './Shared/EntityList';
import { AdminInput, AdminTextarea } from '@/components/AdminUI';
import type { Phase } from '@/types';

const initialFormState = {
  title: '',
  description: '',
  order_index: '1'
};

export default function PhaseForm() {
  const { caseId, selectedCase } = useAdminContext();

  const {
    formData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, isProcessing, feedback
  } = useAdminForm({
    entityType: 'phase',
    initialState: initialFormState,
    basePayload: { case_id: caseId }
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory in the sidebar to manage its Phases.</p>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => handleSubmit(e);

  const onEdit = (phase: Phase) => {
    handleEditInit(phase, (p) => ({
      title: p.title,
      description: p.description || '',
      order_index: p.order_index.toString()
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <AdminFormLayout editingId={editingId} entityName="Phase" contextHeader={`Targeting Case: ${selectedCase.title}`} feedback={feedback} onCancel={clearForm}>
        <form onSubmit={onSubmit} className="admin-form">
          <AdminInput
            label="Chronological Order Index"
            type="number"
            min="1"
            required
            value={formData.order_index}
            onChange={(e) => updateField('order_index', e.target.value)}
          />

          <AdminInput
            label="Phase Title (e.g. 'The Setup', 'The Alibi')"
            type="text"
            required
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
          />

          <AdminTextarea
            label="Description (Optional Narrative Fluff)"
            style={{ minHeight: '100px' }}
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
          />

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Phase' : 'Commit Phase'}
          </button>
        </form>
      </AdminFormLayout>

      <EntityList<Phase>
        title={`Active Phases in ${selectedCase.title}`}
        items={selectedCase.phases || []}
        emptyMessage="No phases assigned to this case."
        keyExtractor={(p) => p.id}
        isProcessing={isProcessing}
        onEdit={onEdit}
        onDelete={(p) => handleDelete(p.id, `Are you absolutely sure you want to delete the "${p.title}" phase? All levels and questions inside it will be orphaned or deleted.`)}
        renderItemContent={(p) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>IDX: {p.order_index}</span>
            <strong>{p.title}</strong>
          </>
        )}
      />
    </div>
  );
}