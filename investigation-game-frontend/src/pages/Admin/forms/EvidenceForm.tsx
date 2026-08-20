import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import EntityList from './Shared/EntityList';
import EvidenceMetadataFields from './Shared/EvidenceMetadataFields';
import type { Evidence } from '@/types/evidence';

export default function EvidenceForm() {
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState<string>('document');
  const [subType, setSubType] = useState('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  
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
    setTitle(''); setDescription(''); 
    setSubType(''); setMetadata({});
    setIsInitial(true); setIsVitalForConviction(false); setStoreLocally(false);
    setImage(null); setAudio(null);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // When changing the top-level type, wipe the previous sub_type and metadata payload to prevent corruption
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEvidenceType(e.target.value);
    setSubType('');
    setMetadata({});
  };

  const updateMeta = (key: string, value: any) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    const formData = new FormData();
    formData.append('case_id', caseId); 
    formData.append('title', title);
    formData.append('evidence_type', evidenceType); 
    formData.append('description', description);
    formData.append('is_initial', isInitial ? '1' : '0');
    formData.append('is_vital_for_conviction', isVitalForConviction ? '1' : '0');
    formData.append('store_locally', storeLocally ? '1' : '0');
    
    // Append the new structured fields
    if (subType) formData.append('sub_type', subType);
    if (Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
  if ((evidenceType === 'image' || subType === 'background_check') && image) {
    formData.append('image', image);
  }
    if (evidenceType === 'audio' && audio) formData.append('audio', audio);

    if (editingId) {
      updateEntity({ id: editingId, formData }, { onSuccess: clearForm });
    } else {
      createEntity(formData, { onSuccess: clearForm });
    }
  };

  const handleEdit = (ev: Evidence | any) => {
    setEditingId(ev.id);
    setTitle(ev.title); 
    setDescription(ev.description || ''); 
    setEvidenceType(ev.evidence_type); 
    setSubType(ev.sub_type || '');
    setMetadata(ev.metadata || {});
    
    setIsInitial(!!ev.is_initial);
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
            <label>Master Evidence Category</label>
            <select className="admin-input" value={evidenceType} onChange={handleTypeChange}>
              <option value="document">Written Document</option>
              <option value="testimony">Witness Testimony</option>
              <option value="forensic">Forensic Report</option>
              <option value="audio">Audio Recording</option>
              <option value="image">Photographic Evidence</option>
            </select>
          </div>

          <div className="form-group"><label>Evidence Title</label><input type="text" className="admin-input" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="form-group"><label>Short Description (Hover text / Caption)</label><input type="text" className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>

          {/* DYNAMIC METADATA COMPONENT INJECTION */}
          <EvidenceMetadataFields 
            evidenceType={evidenceType} 
            subType={subType} 
            setSubType={setSubType} 
            metadata={metadata} 
            updateMeta={updateMeta} 
          />

          {(evidenceType === 'image' || subType === 'background_check') && (
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>{subType === 'background_check' ? 'Subject Mugshot / ID Photo' : 'Evidence Image'}</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                <strong>Optimal:</strong> 1:1 or 3:4 portrait. WEBP or JPG. Max 4MB.
              </p>
              <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </div>
          )}
          
          {evidenceType === 'audio' && (
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Audio Recording</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}><strong>Optimal:</strong> MP3 or WAV format. Compressed for web streaming. Max 10MB.</p>
              <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={(e) => setAudio(e.target.files?.[0] || null)} />
            </div>
          )}

          {(evidenceType === 'image' || evidenceType === 'audio' || subType === 'background_check') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <input type="checkbox" id="store-locally-toggle" checked={storeLocally} onChange={(e) => setStoreLocally(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
              <label htmlFor="store-locally-toggle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-amber)', cursor: 'pointer', margin: 0 }}>
                <strong>Store Locally on Server:</strong> Save assets directly to public server folders instead of Cloudinary.
              </label>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Evidence' : 'Commit Evidence'}
          </button>
        </form>
      </div>

      <EntityList<Evidence>
        title="Case Evidence"
        items={selectedCase.evidences || []}
        emptyMessage="No evidence secured for this case."
        keyExtractor={(ev) => ev.id.toString()}
        isProcessing={isProcessing}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderItemContent={(ev: any) => (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginRight: '1rem' }}>
              EX-{ev.id.toString().padStart(3, '0')}
            </span>
            <strong>{ev.title}</strong>
            {ev.sub_type && (
              <span style={{ marginLeft: '1rem', fontSize: '0.75rem', padding: '0.1rem 0.5rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                {ev.sub_type.replace('_', ' ')}
              </span>
            )}
          </>
        )}
      />
    </div>
  );
}