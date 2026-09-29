import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import { DocBuilder } from '@/pages/Admin/components/DocBuilder/DocBuilder';
import EvidenceMetadataFields from './Shared/EvidenceMetadataFields';
import { AdminCheckbox, AdminInput, AdminFileInput, AdminEntryToggle, JsonPopulator } from '@/pages/Admin/components/AdminUI';
import { validateEvidenceForm, validateImageSize, validateAudioSize } from '../utils/validators';
import { getEvidenceMetadataTemplate } from '@/pages/Admin/utils/formUtils';
import { DEFAULT_DOC, DEFAULT_PAGE, DOC_THEMES, normalizeDoc } from '@/types/evidence/doc';
import type { Evidence } from '@/types/evidence';
import './Shared/AdminForms.css';

const initialFormState = {
  title: '',
  description: '',
  evidence_type: 'document',
  metadata: {} as Record<string, any>,
  is_initial: true,
  is_vital_for_conviction: false,
  store_locally: false,
};

const isDocType = (t: string): boolean => t === 'document' || t === 'forensic';

const emptyDoc = () => ({ ...DEFAULT_DOC, page: { ...DEFAULT_PAGE }, blocks: [] });

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

  const [entryMode, setEntryMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');

  const docType = isDocType(formData.evidence_type);

  useEffect(() => {
    setJsonInput('');
  }, [formData.evidence_type]);

  // The builder is controlled off `formData.metadata.doc`, normalized so a hand
  // written JSON payload (or a legacy row) can never hand it a malformed tree.
  const currentDoc = docType ? normalizeDoc(formData.metadata) : emptyDoc();

  const setDoc = (doc: typeof currentDoc) => {
    setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, doc } }));
  };

  const handleJsonPopulate = (parsed: any) => {
    const newState = { ...formData };

    if (parsed.title !== undefined) newState.title = parsed.title;
    if (parsed.description !== undefined) newState.description = parsed.description;
    if (parsed.evidence_type !== undefined) newState.evidence_type = parsed.evidence_type;
    if (parsed.is_initial !== undefined) newState.is_initial = parsed.is_initial;
    if (parsed.is_vital_for_conviction !== undefined) newState.is_vital_for_conviction = parsed.is_vital_for_conviction;
    if (parsed.store_locally !== undefined) newState.store_locally = parsed.store_locally;
    if (parsed.metadata !== undefined) {
      newState.metadata = isDocType(newState.evidence_type) && !parsed.metadata?.doc
        ? { ...parsed.metadata, doc: normalizeDoc(parsed.metadata?.doc ?? parsed) }
        : parsed.metadata;
    }

    setFormData(newState);
    setEntryMode('form');
    setJsonInput('');
  };

  const combinedTemplate = {
    is_initial: formData.is_initial,
    is_vital_for_conviction: formData.is_vital_for_conviction,
    store_locally: formData.store_locally,
    evidence_type: formData.evidence_type,
    title: formData.title || '',
    description: formData.description || '',
    metadata: getEvidenceMetadataTemplate(formData.evidence_type),
  };

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

  const onClear = () => {
    clearForm();
    setImage(null);
    setAudio(null);
    setEntryMode('form');
    setJsonInput('');
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const files: Record<string, File | null> = {};
    if (formData.evidence_type === 'image' && image) files.image = image;
    if (formData.evidence_type === 'audio' && audio) files.audio = audio;
    handleValidatedSubmit(e, files);
  };

  const onEdit = (ev: Evidence | any) => {
    handleEditInit(ev, (e) => ({
      title: e.title,
      description: e.description || '',
      evidence_type: e.evidence_type,
      // A stored doc row keeps its block tree verbatim; a pre-cutover row with
      // only a flat sub_type metadata object normalizes to an empty sheet the
      // author must fill in. Both land on the same shape.
      metadata: isDocType(e.evidence_type) ? { ...(e.metadata || {}), doc: normalizeDoc(e.metadata) } : (e.metadata || {}),
      is_initial: !!e.is_initial,
      is_vital_for_conviction: !!e.is_vital_for_conviction,
      store_locally: !!e.store_locally,
    }));
    setImage(null);
    setAudio(null);
    setEntryMode('form');
  };

  // Block images upload through their own endpoint, so `store_locally` has to
  // be available before the evidence is saved -- it rides along with the file.
  const requiresImage = formData.evidence_type === 'image';
  const requiresLocalToggle = requiresImage || formData.evidence_type === 'audio' || docType;

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
          <span className="admin-list-badge">{ev.evidence_type}</span>
          {ev.metadata?.doc?.theme && DOC_THEMES.includes(ev.metadata.doc.theme) && (
            <span className="admin-list-badge">{ev.metadata.doc.theme.replace('_', ' ')}</span>
          )}
        </>
      )}
    >
      <form onSubmit={onSubmit} className="admin-form">
        <AdminEntryToggle mode={entryMode} setMode={setEntryMode} />

        {entryMode === 'form' ? (
          <>
            <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialEvidenceLabel} description={t.initialEvidenceDesc} className="status-live" />
            <AdminCheckbox checked={formData.is_vital_for_conviction} onChange={(e) => updateField('is_vital_for_conviction', e.target.checked)} labelTitle={t.vitalEvidenceLabel} description={t.vitalEvidenceDesc} className="status-draft" />
            <div className="form-group">
              <label>{t.masterCategoryLabel}</label>
              <select
                className="admin-input"
                value={formData.evidence_type}
                onChange={(e) => {
                  const type = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    evidence_type: type,
                    // Metadata is type-specific; carrying a doc envelope into a
                    // testimony row (or vice versa) would ship dead payload.
                    metadata: getEvidenceMetadataTemplate(type),
                  }));
                }}
              >
                <option value="document">{t.docOption}</option>
                <option value="testimony">{t.testimonyOption}</option>
                <option value="forensic">{t.forensicOption}</option>
                <option value="audio">{t.audioOption}</option>
                <option value="image">{t.imageOption}</option>
              </select>
            </div>
            <AdminInput label={t.evidenceTitleLabel} required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
            <AdminInput label={t.evidenceDescLabel} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

            {docType
              ? <DocBuilder doc={currentDoc} onChange={setDoc} caseId={caseId} storeLocally={!!formData.store_locally} />
              : <EvidenceMetadataFields evidenceType={formData.evidence_type} metadata={formData.metadata} updateMeta={(key, value) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))} />}

            {requiresLocalToggle && (
              <AdminCheckbox
                checked={formData.store_locally}
                onChange={(e) => updateField('store_locally', e.target.checked)}
                labelTitle={t.storeLocallyLabel}
                className="amber"
              />
            )}
          </>
        ) : (
          <JsonPopulator
            jsonInput={jsonInput}
            setJsonInput={setJsonInput}
            onPopulate={handleJsonPopulate}
            requiredFields={['title', 'evidence_type']}
            template={combinedTemplate}
          />
        )}

        {requiresImage && <AdminFileInput label={t.evidenceImageLabel} hint={t.imageHint} accept="image/*" ref={registerFileRef('image')} onChange={(e) => handleFileChange(e, setImage, validateImageSize)} />}
        {formData.evidence_type === 'audio' && <AdminFileInput label={t.audioLabel} hint={t.audioHint} accept="audio/*" ref={registerFileRef('audio')} onChange={(e) => handleFileChange(e, setAudio, validateAudioSize)} />}

        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing || entryMode === 'json'}>
          {isProcessing ? t.processingData : editingId ? t.updateEvidence : t.commitEvidence}
        </button>
      </form>
    </EntityDashboard>
  );
}
