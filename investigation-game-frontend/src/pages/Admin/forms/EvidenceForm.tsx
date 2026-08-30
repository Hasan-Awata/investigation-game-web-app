import { useState, useRef } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminMutations } from '@/hooks/useAdminMutations';
import EntityList from './Shared/EntityList';
import EvidenceMetadataFields from './Shared/EvidenceMetadataFields';
import AdminFormHeader from './Shared/AdminFormHeader';
import StatusMessage from './Shared/StatusMessage';
import { validateImageSize, validateAudioSize } from '@/utils/fileValidation';
import { objectToFormData } from '@/utils/formUtils';
import type { Evidence } from '@/types/evidence';

const initialFormState = {
  title: '',
  description: '',
  evidence_type: 'document',
  sub_type: '',
  metadata: {} as Record<string, any>,
  is_initial: true,
  is_vital_for_conviction: false,
  store_locally: false
};

export default function EvidenceForm() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialFormState);

  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { caseId, selectedCase } = useAdminContext();
  const { createEntity, updateEntity, deleteEntity, isProcessing, feedback, clearFeedback } = useAdminMutations('evidence');

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to manage Evidence.</p>
      </div>
    );
  }

  const updateField = (field: keyof typeof initialFormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      evidence_type: e.target.value,
      sub_type: '',
      metadata: {}
    }));
  };

  const updateMeta = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  };

  const clearForm = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setImage(null); setAudio(null);
    clearFeedback();
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageSize(file)) setImage(file);
    else { setImage(null); if (imageInputRef.current) imageInputRef.current.value = ''; }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateAudioSize(file)) setAudio(file);
    else { setAudio(null); if (audioInputRef.current) audioInputRef.current.value = ''; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    // Prepare a flat payload for our utility mapping
    const payloadData = { ...formData, case_id: caseId };
    
    // We remove metadata here so we can stringify it explicitly below
    delete (payloadData as any).metadata; 

    const payload = objectToFormData(payloadData);

    if (Object.keys(formData.metadata).length > 0) {
      payload.append('metadata', JSON.stringify(formData.metadata));
    }
    if ((formData.evidence_type === 'image' || formData.sub_type === 'background_check') && image) {
      payload.append('image', image);
    }
    if (formData.evidence_type === 'audio' && audio) {
      payload.append('audio', audio);
    }

    if (editingId) updateEntity({ id: editingId, formData: payload }, { onSuccess: clearForm });
    else createEntity(payload, { onSuccess: clearForm });
  };

  const handleEdit = (ev: Evidence | any) => {
    clearFeedback();
    setEditingId(ev.id);
    setFormData({
      title: ev.title,
      description: ev.description || '',
      evidence_type: ev.evidence_type,
      sub_type: ev.sub_type || '',
      metadata: ev.metadata || {},
      is_initial: !!ev.is_initial,
      is_vital_for_conviction: !!ev.is_vital_for_conviction,
      store_locally: !!ev.store_locally
    });

    setImage(null); setAudio(null);
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
    <div className="admin-form-wrapper glass-panel">
      <div>
        <AdminFormHeader 
          editingId={editingId} 
          entityName="Evidence" 
          contextHeader={`Targeting Case: ${selectedCase.title}`} 
          onCancel={clearForm} 
        />
        
        <StatusMessage feedback={feedback} />

        <form onSubmit={handleSubmit} className="admin-form">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="initial-toggle" checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-cyan)' }} />
            <label htmlFor="initial-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', cursor: 'pointer' }}><strong>Initial Evidence:</strong> Available on the board immediately.</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163,50,50,0.1)', border: '1px solid rgba(163,50,50,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <input type="checkbox" id="vital-toggle" checked={formData.is_vital_for_conviction} onChange={(e) => updateField('is_vital_for_conviction', e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-crimson)' }} />
            <label htmlFor="vital-toggle" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', cursor: 'pointer' }}><strong>Vital Evidence:</strong> Required to secure a conviction.</label>
          </div>

          <div className="form-group">
            <label>Master Evidence Category</label>
            <select className="admin-input" value={formData.evidence_type} onChange={handleTypeChange}>
              <option value="document">Written Document</option>
              <option value="testimony">Witness Testimony</option>
              <option value="forensic">Forensic Report</option>
              <option value="audio">Audio Recording</option>
              <option value="image">Photographic Evidence</option>
            </select>
          </div>

          <div className="form-group"><label>Evidence Title</label><input type="text" className="admin-input" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} /></div>
          <div className="form-group"><label>Short Description (Hover text / Caption)</label><input type="text" className="admin-input" value={formData.description} onChange={(e) => updateField('description', e.target.value)} /></div>

          {/* DYNAMIC METADATA COMPONENT INJECTION */}
          <EvidenceMetadataFields
            evidenceType={formData.evidence_type}
            subType={formData.sub_type}
            setSubType={(val) => updateField('sub_type', val)}
            metadata={formData.metadata}
            updateMeta={updateMeta}
          />

          {(formData.evidence_type === 'image' || formData.sub_type === 'background_check') && (
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>{formData.sub_type === 'background_check' ? 'Subject Mugshot / ID Photo' : 'Evidence Image'}</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                <strong>Optimal:</strong> 1:1 or 3:4 portrait. WEBP or JPG. Max 4MB.
              </p>
              <input type="file" className="admin-file-input" accept="image/*" ref={imageInputRef} onChange={handleImageChange} />
            </div>
          )}

          {formData.evidence_type === 'audio' && (
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Audio Recording</label>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}><strong>Optimal:</strong> MP3 or WAV format. Compressed for web streaming. Max 10MB.</p>
              <input type="file" className="admin-file-input" accept="audio/*" ref={audioInputRef} onChange={handleAudioChange} />
            </div>
          )}

          {(formData.evidence_type === 'image' || formData.evidence_type === 'audio' || formData.sub_type === 'background_check') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <input type="checkbox" id="store-locally-toggle" checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: 'var(--accent-amber)' }} />
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