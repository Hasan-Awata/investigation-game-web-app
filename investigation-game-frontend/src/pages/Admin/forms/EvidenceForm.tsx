import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import EvidenceMetadataFields from './Shared/EvidenceMetadataFields';
import { AdminCheckbox, AdminInput, AdminFileInput } from '@/pages/Admin/components/AdminUI';
import { validateEvidenceForm, validateImageSize, validateAudioSize } from '../utils/validators';
import type { Evidence } from '@/types/evidence';
import './Shared/AdminForms.css';

const initialFormState = { title: '', description: '', evidence_type: 'document', sub_type: '', metadata: {} as Record<string, any>, is_initial: true, is_vital_for_conviction: false, store_locally: false };

export default function EvidenceForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceForm;

  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);

  const {
    formData, setFormData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing
  } = useValidatedForm({
    entityType: 'evidence',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: validateEvidenceForm
  });

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle}</h3><p>{t.missingContextDesc}</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, validator: (file: File) => string | null) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFile(null);
      return;
    }
    
    const error = validator(file);
    if (!error) { 
      setFile(file); 
    } else { 
      toast.error(error);
      setFile(null); 
      e.target.value = ''; 
    }
  };

  const onClear = () => { clearForm(); setImage(null); setAudio(null); };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const files: Record<string, File | null> = {};
    if ((formData.evidence_type === 'image' || formData.sub_type === 'background_check') && image) files.image = image;
    if (formData.evidence_type === 'audio' && audio) files.audio = audio;
    handleValidatedSubmit(e, files);
  };

  const onEdit = (ev: Evidence | any) => {
    handleEditInit(ev, (e) => ({
      title: e.title, description: e.description || '', evidence_type: e.evidence_type, sub_type: e.sub_type || '', metadata: e.metadata || {}, is_initial: !!e.is_initial, is_vital_for_conviction: !!e.is_vital_for_conviction, store_locally: !!e.store_locally
    }));
    setImage(null); setAudio(null);
  };

  const requiresImage = formData.evidence_type === 'image' || formData.sub_type === 'background_check';
  const requiresLocalToggle = requiresImage || formData.evidence_type === 'audio';

  return (
    <EntityDashboard<Evidence>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase.evidences || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase.title)} keyExtractor={(ev) => ev.id.toString()}
      onClear={onClear} onEdit={onEdit} onDelete={(ev) => handleDelete(ev.id, t.deleteConfirm(ev.title))}
      renderItemContent={(ev: any) => (
        <>
          <span className="admin-list-id">EX-{ev.id.toString().padStart(3, '0')}</span>
          <strong>{ev.title}</strong>
          {ev.sub_type && <span className="admin-list-badge">{ev.sub_type.replace('_', ' ')}</span>}
        </>
      )}
    >
      <form onSubmit={onSubmit} className="admin-form">
        <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialEvidenceLabel} description={t.initialEvidenceDesc} className="status-live" />
        <AdminCheckbox checked={formData.is_vital_for_conviction} onChange={(e) => updateField('is_vital_for_conviction', e.target.checked)} labelTitle={t.vitalEvidenceLabel} description={t.vitalEvidenceDesc} className="status-draft" />
        <div className="form-group">
          <label>{t.masterCategoryLabel}</label>
          <select className="admin-input" value={formData.evidence_type} onChange={(e) => setFormData(prev => ({ ...prev, evidence_type: e.target.value, sub_type: '', metadata: {} }))}>
            <option value="document">{t.docOption}</option><option value="testimony">{t.testimonyOption}</option><option value="forensic">{t.forensicOption}</option><option value="audio">{t.audioOption}</option><option value="image">{t.imageOption}</option>
          </select>
        </div>
        <AdminInput label={t.evidenceTitleLabel} required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminInput label={t.evidenceDescLabel} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
        <EvidenceMetadataFields evidenceType={formData.evidence_type} subType={formData.sub_type} setSubType={(val) => updateField('sub_type', val)} metadata={formData.metadata} updateMeta={(key, value) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))} />
        {requiresImage && <AdminFileInput label={formData.sub_type === 'background_check' ? t.mugshotLabel : t.evidenceImageLabel} hint={t.imageHint} accept="image/*" ref={registerFileRef('image')} onChange={(e) => handleFileChange(e, setImage, validateImageSize)} />}
        {formData.evidence_type === 'audio' && <AdminFileInput label={t.audioLabel} hint={t.audioHint} accept="audio/*" ref={registerFileRef('audio')} onChange={(e) => handleFileChange(e, setAudio, validateAudioSize)} />}
        {requiresLocalToggle && <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} className="amber" />}
        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing}>
          {isProcessing ? t.processingData : editingId ? t.updateEvidence : t.commitEvidence}
        </button>
      </form>
    </EntityDashboard>
  );
}