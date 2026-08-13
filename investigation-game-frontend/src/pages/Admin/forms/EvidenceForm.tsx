import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import EntityList from './Shared/EntityList';
import type { Evidence, EvidenceType } from '@/types';

export default function EvidenceForm() {
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [paragraph, setParagraph] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  const [isInitial, setIsInitial] = useState(true);
  const [isVitalForConviction, setIsVitalForConviction] = useState(false);
  const [storeLocally, setStoreLocally] = useState(false);
  
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { caseId, selectedCase } = useAdminContext();

  const { 
    createEntity, updateEntity, deleteEntity, isProcessing, 
    feedback, clearFeedback 
  } = useAdminMutations('evidence');

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to manage Evidence.</p>
      </div>
    );
  }

  const clearForm = () => {
    setEditingId(null);
    setTitle(''); setDescription(''); setParagraph('');
    setIsInitial(true); setIsVitalForConviction(false); setStoreLocally(false);
    setImage(null); setAudio(null);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const formData = new FormData();
    formData.append('case_id', caseId); formData.append('title', title);
    formData.append('evidence_type', evidenceType); formData.append('description', description);
    formData.append('paragraph', paragraph); formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('is_vital_for_conviction', isVitalForConviction ? '1' : '0');
    formData.append('store_locally', storeLocally ? '1' : '0');
    
    if (evidenceType === 'image' && image) formData.append('image', image);
    if (evidenceType === 'audio' && audio) formData.append('audio', audio);

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEdit = (ev: Evidence) => {
    setEditingId(ev.id);
    setTitle(ev.title); setDescription(ev.description || ''); setParagraph(ev.paragraph || '');
    setEvidenceType(ev.evidence_type); setIsInitial(!!ev.is_initial);
    setIsVitalForConviction(!!ev.is_vital_for_conviction);
    setImage(null); setAudio(null);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (ev: Evidence) => {
    if (window.confirm(`Are you absolutely sure you want to delete "${ev.title}"?`)) {
      if (editingId === ev.id) clearForm();
      deleteEntity(ev.id);
    }
  };

  return (
    <div className="admin-form-container glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', color: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', margin: '0 0 0.5rem 0' }}>
              {editingId ? `// Editing Evidence ID: ${editingId}` : '// Initialize New Evidence'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Targeting Case: {selectedCase.title}</span>
          </div>
          {editingId && <button type="button" className="btn-secondary" onClick={clearForm} style={{ padding: '0.5rem 1rem', width: 'auto' }}>Cancel Edit</button>}
        </div>

        {feedback && <div className={`status-message ${feedback.type}`}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="initial-toggle" checked={isInitial} onChange={(e) => setIsInitial(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="initial-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}><strong>Initial Evidence:</strong> Available on the board immediately.</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163,50,50,0.1)', border: '1px solid rgba(163,50,50,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="vital-toggle" checked={isVitalForConviction} onChange={(e) => setIsVitalForConviction(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-crimson)' }} />
            <label htmlFor="vital-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', cursor: 'pointer' }}><strong>Vital Evidence:</strong> Required to secure a conviction.</label>
          </div>

          <div className="form-group">
            <label>Evidence Category</label>
            <select className="admin-input" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}>
              <option value="document">Written Document</option>
              <option value="testimony">Witness Testimony</option>
              <option value="audio">Audio Recording</option>
              <option value="image">Photographic Evidence</option>
              <option value="forensic">Forensic Report</option>
            </select>
          </div>

          <div className="form-group"><label>Evidence Title</label><input type="text" className="admin-input" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="form-group"><label>Short Description</label><input type="text" className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="form-group"><label>Text Content (Markdown)</label><textarea className="admin-textarea" value={paragraph} onChange={(e) => setParagraph(e.target.value)} /></div>

          {evidenceType === 'image' && (
            <div className="form-group">
              <label>Evidence Image</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}><strong>Optimal:</strong> 1:1 or 3:4 portrait. Ensure written text is legible. WEBP or JPG. Max 4MB.</p>
              <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </div>
          )}
          
          {evidenceType === 'audio' && (
            <div className="form-group">
              <label>Audio Recording</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}><strong>Optimal:</strong> MP3 or WAV format. Compressed for web streaming. Max 10MB.</p>
              <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} />
            </div>
          )}

          {(evidenceType === 'image' || evidenceType === 'audio') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
              <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer' }}><strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.</label>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '1rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Evidence' : 'Commit Evidence'}
          </button>
        </form>
      </div>

      <EntityList<Evidence>
        title="Case Evidence"
        items={selectedCase.evidences || []}
        emptyMessage="No evidence secured for this case."
        keyExtractor={(ev) => ev.id}
        isProcessing={isProcessing}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItemContent={(ev) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>EX-{ev.id.toString().padStart(3, '0')}</span>
            <strong>{ev.title}</strong>
          </>
        )}
      />
    </div>
  );
}