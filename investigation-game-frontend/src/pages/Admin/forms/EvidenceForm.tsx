import { useState } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useObjectUrl } from '@/pages/Admin/hooks/useObjectUrl';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import { DocBuilder } from '@/pages/Admin/components/DocBuilder/DocBuilder';
import { TerminalBuilder } from '@/pages/Admin/components/BlockBuilder/TerminalBuilder';
import EvidenceMetadataFields from './Shared/EvidenceMetadataFields';
import { AdminCheckbox, AdminInput } from '@/pages/Admin/components/AdminUI';
import { validateEvidenceForm } from '../utils/validators';
import { getEvidenceMetadataTemplate } from '@/pages/Admin/utils/formUtils';
import { DEFAULT_DOC, DEFAULT_PAGE, DOC_THEMES, normalizeDoc } from '@/types/evidence/doc';
import { DEFAULT_TERMINAL, normalizeTerminal } from '@/types/evidence/terminal';
import type { Evidence } from '@/types/evidence';
import { surfaceOf, isDigitalEvidence, isDocEvidence } from '@/types/evidence';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

const initialFormState = {
  title: '',
  description: '',
  evidence_type: 'document',
  metadata: {} as Record<string, unknown>,
  is_initial: true,
  is_vital_for_conviction: false,
  store_locally: false,
  img_url: '',
  audio_url: '',
  clear_img: false,
  clear_audio: false,
};

const emptyDoc = () => ({ ...DEFAULT_DOC, page: { ...DEFAULT_PAGE }, blocks: [] });
const emptyTerminal = () => ({ ...DEFAULT_TERMINAL, blocks: [] });

export default function EvidenceForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceForm;

  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const imagePreviewUrl = useObjectUrl(image);
  const audioPreviewUrl = useObjectUrl(audio);

  const {
    formData, setFormData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, isProcessing
  } = useAdminForm({
    entityType: 'evidence',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: validateEvidenceForm
  });

  const surface = surfaceOf(formData.evidence_type);
  const isDocType = surface === 'paper';
  const isDigitalType = surface === 'terminal';

  // The builder is controlled off `formData.metadata.doc` or `formData.metadata.terminal`, normalized so a hand
  // written JSON payload (or a legacy row) can never hand it a malformed tree.
  const currentDoc = isDocType ? normalizeDoc(formData.metadata) : emptyDoc();
  const currentTerminal = isDigitalType ? normalizeTerminal(formData.metadata) : emptyTerminal();

  const setDoc = (doc: typeof currentDoc) => {
    setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, doc } }));
  };

  const setTerminal = (terminal: typeof currentTerminal) => {
    setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, terminal } }));
  };

  const onClear = () => {
    clearForm();
    setImage(null);
    setAudio(null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const files: Record<string, File | null> = {};
    if (formData.evidence_type === 'image' && image) files.image = image;
    if (formData.evidence_type === 'audio' && audio) files.audio = audio;
    handleSubmit(e, files);
  };

  const onEdit = (ev: Evidence) => {
    const surface = surfaceOf(ev.evidence_type);
    const source = ev as Evidence & { doc?: unknown; terminal?: unknown };
    const rawMetadata = source.metadata && typeof source.metadata === 'object' && !Array.isArray(source.metadata)
      ? source.metadata as Record<string, unknown>
      : {};
    const directDoc = rawMetadata.doc ?? source.doc ?? (Array.isArray(rawMetadata.blocks) ? rawMetadata : undefined);
    const directTerminal = rawMetadata.terminal ?? source.terminal;
    const existingUrl = ev.img_url || ev.audio_url || '';
    handleEditInit(ev, (ed): typeof initialFormState => ({
      title: ed.title,
      description: ed.description || '',
      evidence_type: ed.evidence_type,
      // A stored doc row keeps its block tree verbatim; a pre-cutover row with
      // only a flat sub_type metadata object normalizes to an empty sheet the
      // author must fill in. Both land on the same shape.
      metadata: (surface === 'paper'
        ? { ...rawMetadata, doc: normalizeDoc(directDoc ? { doc: directDoc } : rawMetadata) }
        : surface === 'terminal'
        ? { ...rawMetadata, terminal: normalizeTerminal(directTerminal ? { terminal: directTerminal } : rawMetadata) }
        : rawMetadata) as Record<string, unknown>,
      is_initial: !!ed.is_initial,
      is_vital_for_conviction: !!ed.is_vital_for_conviction,
      store_locally: existingUrl ? !existingUrl.includes('res.cloudinary.com') : true,
      img_url: ed.img_url || '',
      audio_url: ed.audio_url || '',
      clear_img: false,
      clear_audio: false,
    }));
    setImage(null);
    setAudio(null);
  };

  // Block images upload through their own endpoint, so `store_locally` has to
  // be available before the evidence is saved -- it rides along with the file.
  const requiresImage = formData.evidence_type === 'image';
  const requiresLocalToggle = requiresImage || formData.evidence_type === 'audio' || isDocType;

  const contextMissing = !caseId || !selectedCase ? (
    <div className={`${adminDashboard['admin-form-container']} glass-panel ${adminForms['admin-missing-context']}`}>
      <h3>{t.missingContextTitle}</h3><p>{t.missingContextDesc}</p>
    </div>
  ) : null;

  const submitLabel = {
    creating: t.commitEvidence,
    editing: t.updateEvidence,
    processing: t.processingData
  };

  return (
    <EntityDashboard<Evidence>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase?.evidences || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase?.title || '')} keyExtractor={(ev) => ev.id.toString()}
      onClear={onClear} onEdit={onEdit} onDelete={(ev) => handleDelete(ev.id, t.deleteConfirm(ev.title))}
      renderItemContent={(ev) => (
        <>
          <span className={adminForms['admin-list-id']}>EX-{ev.id.toString().padStart(3, '0')}</span>
          <strong>{ev.title}</strong>
          <span className={adminForms['admin-list-badge']}>{ev.evidence_type}</span>
          {isDocEvidence(ev) && ev.metadata.doc.theme && DOC_THEMES.includes(ev.metadata.doc.theme) && (
            <span className={adminForms['admin-list-badge']}>{ev.metadata.doc.theme.replace('_', ' ')}</span>
          )}
          {isDigitalEvidence(ev) && ev.metadata.terminal?.theme && <span className={adminForms['admin-list-badge']}>{ev.metadata.terminal.theme}</span>}
        </>
      )}
      contextMissing={contextMissing}
      submitLabel={submitLabel}
    >
      <form onSubmit={onSubmit} className={adminDashboard['admin-form']}>
        <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialEvidenceLabel} description={t.initialEvidenceDesc} className={adminForms['status-live']} />
        <AdminCheckbox checked={formData.is_vital_for_conviction} onChange={(e) => updateField('is_vital_for_conviction', e.target.checked)} labelTitle={t.vitalEvidenceLabel} description={t.vitalEvidenceDesc} className={adminForms['status-draft']} />
        <div className={adminDashboard['form-group']}>
          <label>{t.masterCategoryLabel}</label>
          <select
            className={adminDashboard['admin-input']}
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
            <option value="forensic">{t.forensicOption}</option>
            <option value="digital">{t.digitalOption}</option>
            <option value="testimony">{t.testimonyOption}</option>
            <option value="audio">{t.audioOption}</option>
            <option value="image">{t.imageOption}</option>
          </select>
        </div>
        <AdminInput label={t.evidenceTitleLabel} required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminInput label={t.evidenceDescLabel} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

        {isDocType
          ? <DocBuilder doc={currentDoc} onChange={setDoc} caseId={caseId} storeLocally={!!formData.store_locally} evidenceId={editingId ?? 0} />
          : isDigitalType
          ? <TerminalBuilder doc={currentTerminal} onChange={setTerminal} evidenceId={editingId ?? 0} />
          : <EvidenceMetadataFields evidenceType={formData.evidence_type} metadata={formData.metadata} updateMeta={(key, value) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))} />}

        {requiresLocalToggle && (
          <AdminCheckbox
            checked={formData.store_locally}
            onChange={(e) => updateField('store_locally', e.target.checked)}
            labelTitle={t.storeLocallyLabel}
            className={adminForms['amber']}
          />
        )}

{requiresImage && <MediaUploader label={t.evidenceImageLabel} hint={t.imageHint} accept="image/*" previewUrl={imagePreviewUrl} onChange={setImage} />}
        {requiresImage && <AdminInput label="Image URL" value={String(formData.img_url || '')} onChange={(e) => { updateField('img_url', e.target.value); updateField('clear_img', false); setImage(null); }} />}
        {requiresImage && editingId && <AdminCheckbox checked={!!formData.clear_img} onChange={(e) => updateField('clear_img', e.target.checked)} labelTitle="Clear image" />}
        {formData.evidence_type === 'audio' && <MediaUploader label={t.audioLabel} hint={t.audioHint} accept="audio/*" previewUrl={audioPreviewUrl} onChange={setAudio} />}
        {formData.evidence_type === 'audio' && <AdminInput label="Audio URL" value={String(formData.audio_url || '')} onChange={(e) => { updateField('audio_url', e.target.value); updateField('clear_audio', false); setAudio(null); }} />}
        {formData.evidence_type === 'audio' && editingId && <AdminCheckbox checked={!!formData.clear_audio} onChange={(e) => updateField('clear_audio', e.target.checked)} labelTitle="Clear audio" />}
      </form>
    </EntityDashboard>
  );
}
