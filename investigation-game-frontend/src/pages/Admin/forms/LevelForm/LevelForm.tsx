import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import { getInvestigationRequestLabel } from '@/types';
import EntityList from '../Shared/EntityList';
import type { Level, Phase } from '@/types';
import { AdminRow, AdminInput, AdminSelect, AdminTextarea, AdminCheckbox, AdminFileInput } from '@/components/AdminUI';

interface InvRequest {
  id: number;
  request_type: string;
}

export default function LevelForm() {
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [orderIndex, setOrderIndex] = useState('1');
  const [image, setImage] = useState<File | null>(null);
  const [storeLocally, setStoreLocally] = useState(false);
  const [isInitial, setIsInitial] = useState(true);
  const [presentationType, setPresentationType] = useState<string>('interrogation');
  const [requiredRequestId, setRequiredRequestId] = useState<string>('');   
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { caseId, phaseId, setPhaseId, selectedCase, selectedPhase, availablePhases } = useAdminContext();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback, clearFeedback 
  } = useAdminMutations('level');

  if (!caseId || !phaseId || !selectedCase || !selectedPhase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: TARGET PHASE REQUIRED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Case and a Phase from the sidebar to manage Levels.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null);
    setTitle(''); setDetails(''); setOrderIndex('1');
    setIsInitial(true); setStoreLocally(false); setPresentationType('standard');
    setRequiredRequestId(''); setImage(null);
    clearFeedback();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const availableRequests = (selectedCase as any)?.investigation_requests as InvRequest[] || [];

  const presentationOptions = [
    { value: 'interrogation', label: 'Suspect Interrogation' },
    { value: 'location', label: 'Location' },
    { value: 'wiretap', label: 'Communications Wiretap' }
  ];

  const requestOptions = [
    { value: '', label: '-- No Requirement --' },
    ...availableRequests.map((req) => ({
      value: req.id.toString(),
      label: `REQ-${req.id}: ${getInvestigationRequestLabel(req.request_type)}`
    }))
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    
    const formData = new FormData();
    formData.append('phase_id', phaseId); formData.append('title', title);
    formData.append('details', details); formData.append('order_index', orderIndex);
    formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('presentation_type', presentationType);
    formData.append('store_locally', storeLocally ? '1' : '0');
    if (requiredRequestId) formData.append('required_request_id', requiredRequestId);
    if (image) formData.append('image', image);

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
      setOrderIndex((prev) => (parseInt(prev || '1') + 1).toString());
    }
  };

  const handleEdit = (level: Level, parentPhaseId: number) => {
    setPhaseId(parentPhaseId.toString());
    setEditingId(level.id);
    setTitle(level.title);
    setDetails(level.details || '');
    setOrderIndex(level.order_index.toString());
    setIsInitial(!!level.is_initial);
    setPresentationType(level.presentation_type || 'standard');
    
    const reqId = (level as any).required_request_id;
    setRequiredRequestId(reqId ? reqId.toString() : '');
    
    setImage(null);
    clearFeedback();
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (level: Level) => {
    if (window.confirm(`Are you absolutely sure you want to delete "${level.title}"? All nested questions and media will be wiped permanently.`)) {
      if (editingId === level.id) clearForm();
      deleteEntity(level.id);
    }
  };

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `// Editing Level ID: ${editingId}` : '// Initialize New Level'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Targeting: {selectedCase.title} &gt; {selectedPhase.title}
            </span>
          </div>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>
              Cancel Edit
            </button>
          )}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <AdminRow>
            <AdminInput label="Phase Order Index" type="number" min="1" required value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
            <AdminSelect label="Presentation Format" value={presentationType} onChange={(e) => setPresentationType(e.target.value)} options={presentationOptions} />
            <AdminSelect label="Required Combo (Gatekeeper)" value={requiredRequestId} onChange={(e) => setRequiredRequestId(e.target.value)} options={requestOptions} />
          </AdminRow>
          
          <AdminCheckbox 
            checked={isInitial} 
            onChange={(e) => setIsInitial(e.target.checked)}
            labelTitle="Initial Phase"
            description="This phase is visible on the roadmap immediately. (Uncheck if it must be unlocked via a specific player choice)."
            accentColor="var(--accent-cyan)"
            bgColor="rgba(0,0,0,0.2)"
          />

          <AdminInput label="Level Title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <AdminTextarea label="Level Details (Objectives)" required value={details} onChange={(e) => setDetails(e.target.value)} />

          <AdminFileInput 
            label={`Location / Background Image ${editingId ? '(Leave blank to keep existing)' : ''}`}
            hint="Optimal: 16:9 ratio (e.g., 1920x1080) for full-screen location sweeps. High contrast recommended. Max 4MB."
            accept="image/*"
            ref={fileInputRef} 
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />

          <AdminCheckbox 
            checked={storeLocally} 
            onChange={(e) => setStoreLocally(e.target.checked)}
            labelTitle="Store Locally on Server"
            description="Save assets directly to public server folders instead of Cloudinary."
            accentColor="var(--accent-amber)"
          />

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Level' : 'Commit Level to Database'}
          </button>
        </form>
      </div>

      {availablePhases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {availablePhases.map((phase: Phase) => (
            <EntityList<Level>
              key={`phase-group-${phase.id}`}
              title={`Levels in Phase: ${phase.title}`}
              items={[...(phase.levels || [])].sort((a, b) => a.order_index - b.order_index)}
              emptyMessage="No levels assigned to this phase."
              keyExtractor={(level) => level.id}
              isProcessing={isProcessing}
              onEdit={(level) => handleEdit(level, phase.id)}
              onDelete={handleDelete}
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