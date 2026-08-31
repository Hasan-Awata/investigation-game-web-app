import React, { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminForm } from '@/hooks/useAdminForm';
import AdminFormLayout from '@/components/AdminFormLayout';
import EntityList from '../Shared/EntityList';
import { getInvestigationRequestLabel } from '@/types';
import type { Level, Phase } from '@/types';
import { AdminRow, AdminInput, AdminSelect, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/components/AdminUI';
import { validateImageSize } from '@/utils/fileValidation';

const initialFormState = {
  title: '',
  details: '',
  order_index: '1',
  store_locally: false,
  is_initial: true,
  presentation_type: 'interrogation',
  required_request_id: ''
};

export default function LevelForm() {
  const { caseId, phaseId, setPhaseId, selectedCase, selectedPhase, availablePhases } = useAdminContext();
  const [image, setImage] = useState<File | null>(null);

  const {
    formData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, registerFileRef, isProcessing, feedback
  } = useAdminForm({
    entityType: 'level',
    initialState: initialFormState,
    basePayload: { phase_id: phaseId }
  });

  if (!caseId || !phaseId || !selectedCase || !selectedPhase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: TARGET PHASE REQUIRED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Case and a Phase from the sidebar to manage Levels.</p>
      </div>
    );
  }

  const availableRequests = (selectedCase as any)?.investigation_requests || [];
  
  const presentationOptions = [
    { value: 'interrogation', label: 'Suspect Interrogation' },
    { value: 'location', label: 'Location Sweep' },
    { value: 'wiretap', label: 'Communications Wiretap' }
  ];

  const requestOptions = [
    { value: '', label: '-- No Requirement --' },
    ...availableRequests.map((req: any) => ({
      value: req.id.toString(),
      label: `REQ-${req.id}: ${getInvestigationRequestLabel(req.request_type)}`
    }))
  ];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => handleSubmit(e, { image });

  const onEdit = (level: Level, parentPhaseId: number) => {
    setPhaseId(parentPhaseId.toString()); // Ensure the global context reflects the parent phase
    
    handleEditInit(level, (l) => ({
      title: l.title,
      details: l.details || '',
      order_index: l.order_index.toString(),
      is_initial: !!l.is_initial,
      presentation_type: l.presentation_type || 'interrogation',
      required_request_id: (l as any).required_request_id?.toString() || '',
      store_locally: false
    }));
    setImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageSize(file)) setImage(file);
    else { setImage(null); e.target.value = ''; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <AdminFormLayout editingId={editingId} entityName="Level" contextHeader={`Targeting: ${selectedCase.title} > ${selectedPhase.title}`} feedback={feedback} onCancel={clearForm}>
        <form onSubmit={onSubmit} className="admin-form">
          <AdminRow>
            <AdminInput label="Phase Order Index" type="number" min="1" required value={formData.order_index} onChange={(e) => updateField('order_index', e.target.value)} />
            <AdminSelect label="Presentation Format" value={formData.presentation_type} onChange={(e) => updateField('presentation_type', e.target.value)} options={presentationOptions} />
            <AdminSelect label="Required Combo (Gatekeeper)" value={formData.required_request_id} onChange={(e) => updateField('required_request_id', e.target.value)} options={requestOptions} />
          </AdminRow>

          <AdminCheckbox
            checked={formData.is_initial}
            onChange={(e) => updateField('is_initial', e.target.checked)}
            labelTitle="Initial Phase"
            description="Visible on the roadmap immediately. (Uncheck if it must be unlocked via a specific choice)."
            accentColor="var(--accent-cyan)"
            bgColor="rgba(0,0,0,0.2)"
          />

          <AdminInput label="Level Title" type="text" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
          <AdminTextarea label="Level Details (Objectives)" required value={formData.details} onChange={(e) => updateField('details', e.target.value)} />

          <AdminFileInput
            label={`Location / Background Image ${editingId ? '(Leave blank to keep existing)' : ''}`}
            hint="Optimal: 16:9 ratio (e.g., 1920x1080) for full-screen location sweeps. High contrast recommended. Max 4MB."
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
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Level' : 'Commit Level to Database'}
          </button>
        </form>
      </AdminFormLayout>

      {/* Renders grouped lists of levels per phase */}
      {availablePhases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {availablePhases.map((phase: Phase) => (
            <EntityList<Level>
              key={`phase-group-${phase.id}`}
              title={`Levels in Phase: ${phase.title}`}
              items={[...(phase.levels || [])].sort((a, b) => a.order_index - b.order_index)}
              emptyMessage="No levels assigned to this phase."
              keyExtractor={(level) => level.id.toString()}
              isProcessing={isProcessing}
              onEdit={(level) => onEdit(level, phase.id)}
              onDelete={(level) => handleDelete(level.id, `Are you absolutely sure you want to delete "${level.title}"? All nested questions and media will be wiped permanently.`)}
              renderItemContent={(level) => (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginRight: '1rem' }}>IDX: {level.order_index}</span>
                  <strong>{level.title}</strong>
                  <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({level.presentation_type})</span>
                </>
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}