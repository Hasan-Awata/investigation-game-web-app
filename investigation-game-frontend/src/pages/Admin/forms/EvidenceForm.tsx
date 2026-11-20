import { useState } from 'react';
import { useAdminContext } from '@/pages/Admin/context/AdminContext.shared';
import { useAdminForm } from '@/pages/Admin/hooks/useAdminForm';
import { useObjectUrl } from '@/pages/Admin/hooks/useObjectUrl';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import TemplateEditor from './Shared/TemplateEditor';
import { readTemplate, templateDefinition } from '@/features/evidence/presentation/catalog';
import { useTranslation } from 'react-i18next';
import EvidenceMetadataFields from './Shared/EvidenceMetadataFields';
import { AdminCheckbox, AdminInput } from '@/pages/Admin/components/AdminUI';
import type { Evidence } from '@/types/evidence';
import type { ValidationErrors } from '@/utils/Result';
import adminForms from './Shared/AdminForms.module.css';
import adminDashboard from '../AdminDashboard.module.css';

const isPaper = (type: string) => type === 'document' || type === 'forensic';

const getEvidenceMetadataTemplate = (evidenceType: string): Record<string, unknown> => {
  if (evidenceType === 'testimony') {
    return {
      agency: "",
      title: "",
      date: "",
      case_number: "",
      subject_name: "",
      interviewer: "",
      context: "",
      transcript: ""
    };
  }

  return {};
};

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

export default function EvidenceForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceForm;
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [templateFiles, setTemplateFiles] = useState<Record<string, File>>({});
  const [templateErrors, setTemplateErrors] = useState<ValidationErrors>({});
  const imagePreviewUrl = useObjectUrl(image);
  const audioPreviewUrl = useObjectUrl(audio);

  const {
    formData, setFormData, updateField, editingId, clearForm, handleSubmit, handleEditInit, handleDelete, isProcessing
  } = useAdminForm({
    entityType: 'evidence',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    onValidationErrors: setTemplateErrors,
    validator: data => {
      if (!isPaper(data.evidence_type)) return null;
      const selected = readTemplate(data.metadata);
      return selected && templateDefinition(selected.id, selected.version) ? null :
        locale === 'ar' ? 'اختر قالبًا للدليل.' : 'Choose an evidence template.';
    }
  });

  const isDocType = isPaper(formData.evidence_type);

  const template = readTemplate(formData.metadata);

  const onClear = () => {
    clearForm();
    setImage(null);
    setAudio(null);
    setTemplateFiles({});
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const files: Record<string, File | null> = {};
    if (formData.evidence_type === 'image' && image) files.image = image;
    if (formData.evidence_type === 'audio' && audio) files.audio = audio;
    if (isDocType && template) Object.entries(templateFiles).forEach(([key, file]) => {
      files[`template_images[${key}]`] = file;
    });
    handleSubmit(e, files);
  };

  const onEdit = (ev: Evidence) => {
    let rawMetadata = ev.metadata;
    const savedTemplate = readTemplate(rawMetadata);
    if (rawMetadata && savedTemplate?.id === 'financial_records' && savedTemplate.version === 1) {
      const values = { ...savedTemplate.values };
      delete values.agent;
      delete values.inquiry_date;
      delete values.handling;
      rawMetadata = { ...rawMetadata, template: { ...savedTemplate, values } };
    }
    const existingUrl = ev.img_url || ev.audio_url || '';
    handleEditInit(ev, (ed): typeof initialFormState => ({
      title: ed.title,
      description: ed.description || '',
      evidence_type: ed.evidence_type,
      metadata: { ...rawMetadata },
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
    setTemplateFiles({});
  };

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
        </>
      )}
      contextMissing={contextMissing}
      submitLabel={submitLabel}
    >
      <form id="admin-entity-form" onSubmit={onSubmit} className={adminDashboard['admin-form']}>
        <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialEvidenceLabel} description={t.initialEvidenceDesc} className={adminForms['status-live']} />
        <AdminCheckbox checked={formData.is_vital_for_conviction} onChange={(e) => updateField('is_vital_for_conviction', e.target.checked)} labelTitle={t.vitalEvidenceLabel} description={t.vitalEvidenceDesc} className={adminForms['status-draft']} />
        <div className={adminDashboard['form-group']}>
          <label>{t.masterCategoryLabel}</label>
          <select
            className={adminDashboard['admin-input']}
            value={formData.evidence_type}
            onChange={(e) => {
              const type = e.target.value;
              updateField('evidence_type', type);
              if (isDocType && template && templateDefinition(template.id, template.version)?.types.some(entry => entry === type)) {
                return;
              }
              setTemplateFiles({});
              setFormData(prev => ({
                ...prev,
                metadata: getEvidenceMetadataTemplate(type),
              }));
            }}
          >
            <option value="document">{t.docOption}</option>
            <option value="forensic">{t.forensicOption}</option>
            <option value="testimony">{t.testimonyOption}</option>
            <option value="audio">{t.audioOption}</option>
            <option value="image">{t.imageOption}</option>
          </select>
        </div>
        <AdminInput label={t.evidenceTitleLabel} required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
        <AdminInput label={t.evidenceDescLabel} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

        {isDocType
          ? <TemplateEditor key={`${caseId}:${editingId ?? 'new'}`} type={formData.evidence_type} template={template}
              files={templateFiles} errors={templateErrors} characters={selectedCase?.characters ?? []} onChange={(next, files) => {
                updateField('metadata', { ...formData.metadata, template: next });
                setTemplateFiles(files);
              }} />
          : formData.evidence_type === 'testimony' && <EvidenceMetadataFields metadata={formData.metadata} updateMeta={(key, value) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))} />}

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
