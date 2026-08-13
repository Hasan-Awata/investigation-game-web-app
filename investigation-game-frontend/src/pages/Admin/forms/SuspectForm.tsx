import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import EntityList from './Shared/EntityList';
import type { Suspect } from '@/types';

export default function SuspectForm() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [isInitial, setIsInitial] = useState(true);
  const [isGuilty, setIsGuilty] = useState(false); 
  const [storeLocally, setStoreLocally] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { caseId, selectedCase } = useAdminContext();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback, clearFeedback 
  } = useAdminMutations('suspect');

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to manage Suspects.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null);
    setName(''); setBackground(''); setIsInitial(true); setIsGuilty(false);
    setStoreLocally(false); setImage(null);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const formData = new FormData();
    formData.append('case_id', caseId); formData.append('name', name);
    formData.append('background', background); formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('is_guilty', isGuilty ? '1' : '0'); formData.append('store_locally', storeLocally ? '1' : '0');
    if (image) formData.append('image', image);

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEdit = (suspect: Suspect) => {
    setEditingId(suspect.id);
    setName(suspect.name); setBackground(suspect.background || '');
    setIsInitial(!!suspect.is_initial); setIsGuilty(!!suspect.is_guilty);
    setImage(null);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (suspect: Suspect) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${suspect.name}?`)) {
      if (editingId === suspect.id) clearForm();
      deleteEntity(suspect.id);
    }
  };

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `// Editing Suspect ID: ${editingId}` : '// Initialize New Suspect'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Targeting Case: {selectedCase.title}</span>
          </div>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163,50,50,0.1)', border: '1px solid rgba(163,50,50,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="suspect-guilty-toggle" checked={isGuilty} onChange={(e) => setIsGuilty(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-crimson)' }} />
            <label htmlFor="suspect-guilty-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', cursor: 'pointer' }}>
              <strong>Guilty Verdict:</strong> This individual is one of the actual perpetrators required to solve the case.
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="suspect-initial-toggle" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="suspect-initial-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Initial Suspect:</strong> Available on the board immediately when the case starts.
            </label>
          </div>

          <div className="form-group"><label>Full Name / Alias</label><input type="text" className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="form-group"><label>Background Intel</label><textarea className="admin-textarea" value={background} onChange={(e) => setBackground(e.target.value)} /></div>
          <div className="form-group">
            <label>Mugshot {editingId && '(Leave blank to keep existing)'}</label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <strong>Optimal:</strong> 1:1 (Square) ratio. Face centered. Min 400x400px. WEBP or JPG. Max 4MB.
            </p>
            <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
            <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}>
              <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Suspect' : 'Commit Suspect to Database'}
          </button>
        </form>
      </div>

      <EntityList<Suspect>
        title="Case Suspects"
        items={selectedCase.suspects || []}
        emptyMessage="No suspects filed for this case."
        keyExtractor={(s) => s.id}
        isProcessing={isProcessing}
        onEdit={handleEdit}
        onDelete={handleDelete}
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