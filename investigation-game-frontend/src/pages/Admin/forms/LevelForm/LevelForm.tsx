import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import { getInvestigationRequestLabel } from '@/types';
import EntityList from '../Shared/EntityList';
import type { Level, Phase } from '@/types';

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
  const [presentationType, setPresentationType] = useState<string>('standard');
  const [requiredRequestId, setRequiredRequestId] = useState<string>('');   
  const fileInputRef = useRef<HTMLInputElement>(null);

  // setPhaseId is kept because editing a level updates the active phase in Context
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
          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Phase Order Index</label>
              <input type="number" className="admin-input" min="1" required value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Presentation Format</label>
              <select className="admin-input" value={presentationType} onChange={(e) => setPresentationType(e.target.value)}>
                <option value="standard">Standard Investigation</option>
                <option value="interrogation">Suspect Interrogation</option>
                <option value="location">Location</option>
                <option value="wiretap">Communications Wiretap</option> 
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Required Combo (Gatekeeper)</label>
              <select className="admin-input" value={requiredRequestId} onChange={(e) => setRequiredRequestId(e.target.value)}>
                <option value="">-- No Requirement --</option>
                {availableRequests.map((req) => (
                  <option key={req.id} value={req.id}>
                    REQ-{req.id}: {getInvestigationRequestLabel(req.request_type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="initial-level-toggle" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="initial-level-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Initial Phase:</strong> This phase is visible on the roadmap immediately. (Uncheck if it must be unlocked via a specific player choice).
            </label>
          </div>

          <div className="form-group">
            <label>Level Title</label>
            <input type="text" className="admin-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Level Details (Objectives)</label>
            <textarea className="admin-textarea" required value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Location / Background Image {editingId && '(Leave blank to keep existing)'}</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <strong>Optimal:</strong> 16:9 ratio (e.g., 1920x1080) for full-screen location sweeps. High contrast recommended. Max 4MB.
            </p>
            <input type="file" className="admin-file-input" accept="image/*" ref={fileInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}>
              <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
            </label>
          </div>

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