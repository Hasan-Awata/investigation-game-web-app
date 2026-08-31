import React, { useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { useAdminForm } from '@/hooks/useAdminForm';
import AdminFormLayout from '@/components/AdminFormLayout';
import EntityList from './Shared/EntityList';
import EvidenceMetadataFields from './Shared/EvidenceMetadataFields';
import { AdminCheckbox, AdminInput, AdminFileInput } from '@/components/AdminUI';
import { validateImageSize, validateAudioSize } from '@/utils/fileValidation';
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
  const { caseId, selectedCase } = useAdminContext();
  
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);

  const {
    formData, setFormData, updateField, editingId, clearForm, handleSubmit,
    handleEditInit, handleDelete, registerFileRef, isProcessing, feedback
  } = useAdminForm({
    entityType: 'evidence',
    initialState: initialFormState,
    basePayload: { case_id: caseId }
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', margin: '0 0 1rem 0' }}>[ MISSING CONTEXT: NO CASE SELECTED ]</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Please select a Target Case from the Global Directory to manage Evidence.</p>
      </div>
    );
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, evidence_type: e.target.value, sub_type: '', metadata: {} }));
  };

  const updateMeta = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setFile: React.Dispatch<React.SetStateAction<File | null>>, 
    validator: (file: File) => boolean
  ) => {
    const file = e.target.files?.[0];
    if (file && validator(file)) {
      setFile(file);
    } else {
      setFile(null);
      e.target.value = '';
    }
  };

  const onClear = () => {
    clearForm();
    setImage(null);
    setAudio(null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const files: Record<string, File | null> = {};
    if ((formData.evidence_type === 'image' || formData.sub_type === 'background_check') && image) files.image = image;
    if (formData.evidence_type === 'audio' && audio) files.audio = audio;
    
    handleSubmit(e, files);
  };

  const onEdit = (ev: Evidence | any) => {
    handleEditInit(ev, (e) => ({
      title: e.title,
      description: e.description || '',
      evidence_type: e.evidence_type,
      sub_type: e.sub_type || '',
      metadata: e.metadata || {},
      is_initial: !!e.is_initial,
      is_vital_for_conviction: !!e.is_vital_for_conviction,
      store_locally: !!e.store_locally
    }));
    setImage(null);
    setAudio(null);
  };

  const requiresImage = formData.evidence_type === 'image' || formData.sub_type === 'background_check';
  const requiresLocalToggle = requiresImage || formData.evidence_type === 'audio';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <AdminFormLayout editingId={editingId} entityName="Evidence" contextHeader={`Targeting Case: ${selectedCase.title}`} feedback={feedback} onCancel={onClear}>
        <form onSubmit={onSubmit} className="admin-form">
          <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle="Initial Evidence" description="Available on the board immediately." accentColor="var(--accent-cyan)" bgColor="rgba(0,0,0,0.2)" />
          <AdminCheckbox checked={formData.is_vital_for_conviction} onChange={(e) => updateField('is_vital_for_conviction', e.target.checked)} labelTitle="Vital Evidence" description="Required to secure a conviction." accentColor="var(--accent-crimson)" bgColor="rgba(163,50,50,0.1)" />

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

          <AdminInput label="Evidence Title" required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
          <AdminInput label="Short Description (Hover text / Caption)" value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

          <EvidenceMetadataFields
            evidenceType={formData.evidence_type}
            subType={formData.sub_type}
            setSubType={(val) => updateField('sub_type', val)}
            metadata={formData.metadata}
            updateMeta={updateMeta}
          />

          {requiresImage && (
            <AdminFileInput 
              label={formData.sub_type === 'background_check' ? 'Subject Mugshot / ID Photo' : 'Evidence Image'} 
              hint="Optimal: 1:1 or 3:4 portrait. WEBP or JPG. Max 4MB." 
              accept="image/*" 
              ref={registerFileRef('image')} 
              onChange={(e) => handleFileChange(e, setImage, validateImageSize)} 
            />
          )}

          {formData.evidence_type === 'audio' && (
            <AdminFileInput 
              label="Audio Recording" 
              hint="Optimal: MP3 or WAV format. Compressed for web streaming. Max 10MB." 
              accept="audio/*" 
              ref={registerFileRef('audio')} 
              onChange={(e) => handleFileChange(e, setAudio, validateAudioSize)} 
            />
          )}

          {requiresLocalToggle && (
            <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle="Store Locally on Server" accentColor="var(--accent-amber)" />
          )}

          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ background: editingId ? 'var(--accent-amber)' : 'var(--accent-crimson)', color: 'var(--bg-dark)', marginTop: '2rem' }}>
            {isProcessing ? 'Processing Data...' : editingId ? 'Update Evidence' : 'Commit Evidence'}
          </button>
        </form>
      </AdminFormLayout>

      <EntityList<Evidence>
        title="Case Evidence"
        items={selectedCase.evidences || []}
        emptyMessage="No evidence secured for this case."
        keyExtractor={(ev) => ev.id.toString()}
        isProcessing={isProcessing}
        onEdit={onEdit}
        onDelete={(ev) => handleDelete(ev.id, `Are you absolutely sure you want to delete "${ev.title}"?`)}
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