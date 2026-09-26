import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAdminContext } from '@/pages/Admin/context/AdminContext';
import { useValidatedForm } from '@/pages/Admin/hooks/useValidatedForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import EntityDashboard from '@/pages/Admin/components/EntityDashboard';
import AdminPageBuilder from './Shared/AdminPageBuilder';
import EvidencePreview from './Shared/EvidencePreview';
import { AdminCheckbox, AdminSelect, AdminInput, AdminFileInput, AdminTextarea, AdminEntryToggle, JsonPopulator } from '@/pages/Admin/components/AdminUI';
import { validateEvidenceForm, validateImageSize, validateAudioSize } from '../utils/validators';
import { fetchEvidenceSchema, fetchSignatures } from '@/services/adminApi';
import {
  PaperFinish,
  ViewerStrategy,
  isDraftPagedPayload,
  type AdminEvidence,
  type ArtifactPayload,
  type DraftEvidencePage,
  type DraftPagedPayload,
  type EvidenceSchema,
  type EvidenceType,
  type PaperFinish as PaperFinishValue,
  type SignatureOption,
  type ViewerStrategy as ViewerStrategyValue,
} from '@/types/evidence';
import type { AdminTranslationSchema } from '@/pages/Admin/hooks/useAdminTranslation';
import './Shared/AdminForms.css';

const DEFAULT_TYPE: EvidenceType = 'document';

/** A fresh single-page paged payload; the shape the validator requires. */
const emptyPages = (): DraftEvidencePage[] => [{ id: crypto.randomUUID(), blocks: [] }];

/** A fresh artifact payload. The CSS is empty so the author starts from markup only. */
const emptyArtifact = () => ({ kind: 'html' as const, html: '', css: '' });

/**
 * The starting payload for a strategy.
 *
 * A paged strategy gets an empty page, an artifact gets empty markup, and a
 * media evidence gets nothing at all — a media evidence has no document, and
 * sending one would be state the server has no place to put.
 */
function emptyPayloadFor(strategy: ViewerStrategyValue) {
  if (strategy === ViewerStrategy.Paper || strategy === ViewerStrategy.Terminal) {
    return { pages: emptyPages() };
  }

  if (strategy === ViewerStrategy.Artifact) {
    return emptyArtifact();
  }

  return null;
}

const initialFormState = {
  title: '',
  description: '',
  evidence_type: DEFAULT_TYPE as EvidenceType,
  viewer_strategy: ViewerStrategy.Paper as ViewerStrategyValue,
  paper_finish: PaperFinish.Blank as PaperFinishValue | null,
  content_payload: emptyPayloadFor(ViewerStrategy.Paper) as DraftPagedPayload | ArtifactPayload | null,
  is_initial: true,
  is_vital_for_conviction: false,
  store_locally: false,
};

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, keyof AdminTranslationSchema['forms']['evidenceForm']> = {
  document: 'docOption',
  forensic: 'forensicOption',
  testimony: 'testimonyOption',
  image: 'imageOption',
  audio: 'audioOption',
  digital: 'digitalOption',
  ballistics: 'ballisticsOption',
  custom: 'customOption',
};

export default function EvidenceForm() {
  const { caseId, selectedCase } = useAdminContext();
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.evidenceForm;

  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [schema, setSchema] = useState<EvidenceSchema | null>(null);
  const [signatures, setSignatures] = useState<SignatureOption[]>([]);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const {
    formData, setFormData, updateField, editingId, clearForm, handleValidatedSubmit, handleEditInit, handleDelete, registerFileRef, isProcessing
  } = useValidatedForm({
    entityType: 'evidence',
    initialState: initialFormState,
    basePayload: { case_id: caseId },
    validator: validateEvidenceForm,
  });

  // Switching type or strategy rewrites several fields at once, which
  // `setFormData` alone would do without arming the unsaved-changes guard.
  const { setIsDirty } = useAdminContext();

  const [entryMode, setEntryMode] = useState<'form' | 'json'>('form');
  const [jsonInput, setJsonInput] = useState('');

  // The block catalog and the presentation matrix both come from the server, so
  // the editor cannot offer a block or strategy the write path would reject.
  useEffect(() => {
    let cancelled = false;

    fetchEvidenceSchema().then((schemaResult) => {
      if (cancelled) return;

      if (!schemaResult.isSuccess) {
        setSchemaError(schemaResult.errorMessage);
        return;
      }

      const loaded = schemaResult.value;
      setSchema(loaded);

      // Seed the form from the served defaults for the initial type rather than
      // from constants here, so the first render already matches what the
      // server would have chosen.
      const rules = loaded.strategy_rules[DEFAULT_TYPE];
      if (rules?.default_strategy) {
        updateField('viewer_strategy', rules.default_strategy);
        updateField('paper_finish', rules.default_finish);
      }
    });

    fetchSignatures().then((signatureResult) => {
      if (cancelled) return;
      if (signatureResult.isSuccess) {
        setSignatures(signatureResult.value);
      }
    });

    return () => {
      cancelled = true;
    };
    // Runs once: later strategy/finish changes are driven by the type picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rules = schema?.strategy_rules[formData.evidence_type];
  const strategy = formData.viewer_strategy;

  /** Only a paper presentation has paper, so the finish picker is scoped to it. */
  const isPaged = strategy === ViewerStrategy.Paper || strategy === ViewerStrategy.Terminal;
  const isArtifact = strategy === ViewerStrategy.Artifact;

  /**
   * The payload the editors read from.
   *
   * `content_payload` is the one form field that is sent to the server, so it is
   * also the one that is edited. The editors read a guaranteed shape out of it
   * rather than each keeping a private copy that has to be reconciled on submit.
   */
  const pagedPages: DraftEvidencePage[] = isDraftPagedPayload(formData.content_payload)
    ? formData.content_payload.pages
    : emptyPages();

  const artifactHtml = isDraftPagedPayload(formData.content_payload)
    ? ''
    : (formData.content_payload as { html?: string; css?: string } | null)?.html ?? '';

  const artifactCss = isDraftPagedPayload(formData.content_payload)
    ? ''
    : (formData.content_payload as { html?: string; css?: string } | null)?.css ?? '';

  const evidenceTypeOptions = useMemo(
    () =>
      (schema?.types ?? []).map((type) => ({
        value: type.value,
        // The server sends a label; the translated per-type label is preferred
        // when the form has one so the picker stays in the admin language.
        label: (EVIDENCE_TYPE_LABELS[type.value] ? t[EVIDENCE_TYPE_LABELS[type.value]] : type.label) as string,
      })),
    [schema, t]
  );

  const strategyOptions = useMemo(() => {
    const allowed = rules?.strategies ?? [];

    return allowed.map((value) => ({
      value,
      label: (t.strategyOptions[value] ?? value) as string,
    }));
  }, [rules, t]);

  const paperFinishOptions = useMemo(
    () =>
      (schema?.paper.finishes ?? []).map((value) => ({
        value,
        label: (t.paperFinishOptions[value] ?? value) as string,
      })),
    [schema, t]
  );

  /**
   * Applies a type change.
   *
   * The strategy, finish and payload are all re-derived from the served rules
   * for the new type. Carrying a strategy across a type boundary would build a
   * combination the server refuses, and carrying the payload would leave blocks
   * on a media evidence that has nowhere to render them.
   */
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextType = e.target.value as EvidenceType;
      const nextRules = schema?.strategy_rules[nextType];
      const nextStrategy = nextRules?.default_strategy ?? ViewerStrategy.Paper;
      const nextIsPaged = nextStrategy === ViewerStrategy.Paper || nextStrategy === ViewerStrategy.Terminal;

      setFormData((prev) => ({
        ...prev,
        evidence_type: nextType,
        viewer_strategy: nextStrategy,
        // A non-paper presentation has no stock, and carrying a stale finish
        // there is invalid state rather than a harmless extra.
        paper_finish: nextIsPaged ? nextRules?.default_finish ?? PaperFinish.Blank : null,
        content_payload: emptyPayloadFor(nextStrategy),
      }));

      setJsonInput('');
      setIsDirty(true);
    },
    [schema, setFormData, setIsDirty]
  );

  const handleStrategyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextStrategy = e.target.value as ViewerStrategyValue;
      const nextIsPaged = nextStrategy === ViewerStrategy.Paper || nextStrategy === ViewerStrategy.Terminal;

      setFormData((prev) => ({
        ...prev,
        viewer_strategy: nextStrategy,
        paper_finish: nextIsPaged ? schema?.strategy_rules[prev.evidence_type]?.default_finish ?? PaperFinish.Blank : null,
        // Switching medium discards the payload of the other shape rather than
        // translating it, so no half-converted document is ever submitted.
        content_payload: emptyPayloadFor(nextStrategy),
      }));

      setIsDirty(true);
    },
    [schema, setFormData, setIsDirty]
  );

  const handleJsonPopulate = (parsedInput: unknown) => {
    // Bulk JSON is author-supplied, so it is narrowed once here rather than
    // trusted field by field below.
    const parsed = (typeof parsedInput === 'object' && parsedInput !== null ? parsedInput : {}) as Record<string, unknown>;

    // A field of the wrong type falls back to the current value instead of
    // being written through as-is, so one bad key cannot corrupt the form.
    const asString = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);
    const asBoolean = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

    const nextType = (parsed.evidence_type ?? formData.evidence_type) as EvidenceType;
    const nextRules = schema?.strategy_rules[nextType];
    const nextStrategy = (parsed.viewer_strategy ?? nextRules?.default_strategy ?? ViewerStrategy.Paper) as ViewerStrategyValue;
    const nextIsPaged = nextStrategy === ViewerStrategy.Paper || nextStrategy === ViewerStrategy.Terminal;

    // A bulk import may hand over either the bare paged array or a full payload
    // envelope; both are accepted so the template stays copy-pasteable.
    const imported = (parsed.content_payload ?? parsed) as Record<string, unknown>;
    const importedPages = Array.isArray(parsed.pages) ? parsed.pages : imported.pages;

    // An artifact is only adopted when it actually looks like one, so a stray
    // `artifact` key holding something else cannot replace the payload shape.
    const artifactCandidate = ('artifact' in parsed ? parsed.artifact : imported) as Record<string, unknown> | null;
    const importedArtifact: ArtifactPayload | null =
      artifactCandidate !== null && typeof artifactCandidate === 'object' && artifactCandidate.kind === 'html'
        ? {
            kind: 'html',
            html: typeof artifactCandidate.html === 'string' ? artifactCandidate.html : '',
            css: typeof artifactCandidate.css === 'string' ? artifactCandidate.css : '',
          }
        : null;

    setFormData((prev) => ({
      ...prev,
      title: asString(parsed.title, prev.title),
      description: asString(parsed.description, prev.description),
      evidence_type: nextType,
      viewer_strategy: nextStrategy,
      paper_finish: nextIsPaged
        ? (asString(parsed.paper_finish, nextRules?.default_finish ?? PaperFinish.Blank) as PaperFinishValue)
        : null,
      is_initial: asBoolean(parsed.is_initial, prev.is_initial),
      is_vital_for_conviction: asBoolean(parsed.is_vital_for_conviction, prev.is_vital_for_conviction),
      store_locally: asBoolean(parsed.store_locally, prev.store_locally),
      content_payload: nextIsPaged
        ? { pages: Array.isArray(importedPages) && importedPages.length > 0 ? importedPages : emptyPages() }
        : importedArtifact ?? emptyPayloadFor(nextStrategy),
    }));

    setEntryMode('form');
    setJsonInput('');
    setIsDirty(true);
  };

  /**
   * The copy-paste template for the JSON view.
   *
   * It carries the payload under the same key the write path uses for the
   * current strategy, so a template round-trips through `handleJsonPopulate`
   * and a non-paged evidence does not hand an author a stray `pages` key the
   * server would reject.
   */
  const combinedTemplate = useMemo(
    () => ({
      is_initial: formData.is_initial,
      is_vital_for_conviction: formData.is_vital_for_conviction,
      store_locally: formData.store_locally,
      evidence_type: formData.evidence_type,
      viewer_strategy: formData.viewer_strategy,
      paper_finish: formData.paper_finish,
      title: formData.title,
      description: formData.description,
      content_payload: isPaged
        ? { pages: pagedPages }
        : (formData.content_payload ?? null),
    }),
    [formData, isPaged, pagedPages]
  );

  if (!caseId || !selectedCase) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.missingContextTitle}</h3><p>{t.missingContextDesc}</p>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{schemaError}</h3>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="admin-form-container glass-panel admin-missing-context">
        <h3>{t.processingData}</h3>
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
    const nextRules = schema.strategy_rules[DEFAULT_TYPE];

    clearForm();
    setImage(null);
    setAudio(null);
    setEntryMode('form');
    setJsonInput('');

    // clearForm restores the initial state, whose strategy is the paper default;
    // re-seeding from the server keeps that true if the default ever changes.
    if (nextRules?.default_strategy) {
      updateField('viewer_strategy', nextRules.default_strategy);
      updateField('paper_finish', nextRules.default_finish);
    }
  };

  const requiresImage = formData.evidence_type === 'image';
  const requiresAudio = formData.evidence_type === 'audio';
  const isMedia = strategy === ViewerStrategy.Media;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // A paged document with no blocks renders as an empty sheet, which is
    // almost always an author who has not started yet rather than an intent.
    if (isPaged) {
      const blockCount = pagedPages.reduce((total, page) => total + page.blocks.length, 0);

      if (pagedPages.length === 0 || blockCount === 0) {
        toast.error(t.pagedBuilderLabel);
        return;
      }
    }

    if (isArtifact && (artifactHtml.trim() === '')) {
      toast.error(t.artifactHtmlLabel);
      return;
    }

    const files: Record<string, File | null> = {};
    if (requiresImage && image) files.image = image;
    if (requiresAudio && audio) files.audio = audio;

    // `content_payload` is already part of formData, so there is nothing to merge
    // in here: the field that is edited is the field that is sent. A media
    // evidence holds null, which the form encoder drops, and the server reads
    // that as "clear the document".
    handleValidatedSubmit(e, files);
  };

  const onEdit = (ev: AdminEvidence) => {
    const nextType = (ev.evidence_type ?? DEFAULT_TYPE) as EvidenceType;
    const nextRules = schema.strategy_rules[nextType];
    const nextStrategy = (ev.viewer_strategy ?? nextRules?.default_strategy ?? ViewerStrategy.Paper) as ViewerStrategyValue;
    const nextIsPaged = nextStrategy === ViewerStrategy.Paper || nextStrategy === ViewerStrategy.Terminal;
    const payload = ev.content_payload as Record<string, unknown> | null;

    handleEditInit(ev, (entity) => ({
      title: entity.title || '',
      description: entity.description || '',
      evidence_type: nextType,
      viewer_strategy: nextStrategy,
      paper_finish: nextIsPaged
        ? ((entity.paper_finish ?? nextRules?.default_finish ?? PaperFinish.Blank) as PaperFinishValue)
        : null,
      content_payload: nextIsPaged
        ? {
            pages:
              Array.isArray(payload?.pages) && payload.pages.length > 0 ? payload.pages : emptyPages(),
          }
        : payload?.kind === 'html'
          ? {
              kind: 'html' as const,
              html: typeof payload.html === 'string' ? payload.html : '',
              css: typeof payload.css === 'string' ? payload.css : '',
            }
          : emptyPayloadFor(nextStrategy),
      is_initial: !!entity.is_initial,
      is_vital_for_conviction: !!entity.is_vital_for_conviction,
      store_locally: !!entity.store_locally,
    }));

    setImage(null);
    setAudio(null);
    setEntryMode('form');
    setJsonInput('');
  };

  return (
    <EntityDashboard<AdminEvidence>
      entityName={t.entityName} listTitle={t.manageTitle} items={selectedCase.evidences || []}
      editingId={editingId} isProcessing={isProcessing} emptyMessage={t.emptyMessage}
      contextHeader={t.targetCaseHeader(selectedCase.title)} keyExtractor={(ev) => ev.id.toString()}
      onClear={onClear} onEdit={onEdit} onDelete={(ev) => handleDelete(ev.id, t.deleteConfirm(ev.title))}
      renderItemContent={(ev) => (
        <>
          <span className="admin-list-id">EX-{ev.id.toString().padStart(3, '0')}</span>
          <strong>{ev.title}</strong>
          {ev.evidence_type && <span className="admin-list-badge">{ev.evidence_type.replace('_', ' ')}</span>}
        </>
      )}
    >
      <form onSubmit={onSubmit} className="admin-form">
        <AdminEntryToggle mode={entryMode} setMode={setEntryMode} />

        {entryMode === 'form' ? (
          <>
            <AdminCheckbox checked={formData.is_initial} onChange={(e) => updateField('is_initial', e.target.checked)} labelTitle={t.initialEvidenceLabel} description={t.initialEvidenceDesc} className="status-live" />
            <AdminCheckbox checked={formData.is_vital_for_conviction} onChange={(e) => updateField('is_vital_for_conviction', e.target.checked)} labelTitle={t.vitalEvidenceLabel} description={t.vitalEvidenceDesc} className="status-draft" />

            <AdminSelect label={t.masterCategoryLabel} required value={formData.evidence_type} onChange={handleTypeChange} options={evidenceTypeOptions} />

            <AdminSelect
              label={t.strategyLabel}
              hint={t.strategyHint}
              value={formData.viewer_strategy}
              onChange={handleStrategyChange}
              options={strategyOptions}
            />

            {strategy === ViewerStrategy.Paper && (
              <AdminSelect
                label={t.paperFinishLabel}
                // Only rendered for a paper strategy, where the form always
                // holds a finish; the fallback just satisfies the null case.
                value={formData.paper_finish ?? PaperFinish.Blank}
                onChange={(e) => updateField('paper_finish', e.target.value as PaperFinishValue)}
                options={paperFinishOptions}
              />
            )}

            <AdminInput label={t.evidenceTitleLabel} required value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
            <AdminInput label={t.evidenceDescLabel} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />

            {isMedia && <AdminCheckbox checked={formData.store_locally} onChange={(e) => updateField('store_locally', e.target.checked)} labelTitle={t.storeLocallyLabel} className="amber" />}

            {isPaged && (
              <div>
                <h4 className="admin-sub-section-title">{t.pagedBuilderLabel}</h4>
                {/* The preview runs the real Paper/Terminal viewers, so what the
                    author sees is what a player gets rather than an approximation. */}
                <EvidencePreview
                  strategy={formData.viewer_strategy}
                  finish={formData.paper_finish ?? PaperFinish.Blank}
                  pages={pagedPages}
                  blocks={schema.blocks}
                  signatures={signatures}
                  evidenceType={formData.evidence_type}
                />
                <AdminPageBuilder
                  pages={pagedPages}
                  onChange={(next) => updateField('content_payload', { pages: next })}
                  blocks={schema.blocks}
                  signatures={signatures}
                />
              </div>
            )}

            {isArtifact && (
              <div>
                <h4 className="admin-sub-section-title">{t.artifactBuilderLabel}</h4>
                <AdminTextarea
                  label={t.artifactHtmlLabel}
                  hint={t.artifactHtmlHint}
                  value={artifactHtml}
                  onChange={(e) => updateField('content_payload', { kind: 'html', html: e.target.value, css: artifactCss })}
                  minHeight="180px"
                />
                <AdminTextarea
                  label={t.artifactCssLabel}
                  hint={t.artifactCssHint}
                  value={artifactCss}
                  onChange={(e) => updateField('content_payload', { kind: 'html', html: artifactHtml, css: e.target.value })}
                  minHeight="120px"
                />
              </div>
            )}

            {requiresImage && <AdminFileInput label={t.evidenceImageLabel} hint={t.imageHint} accept="image/*" ref={registerFileRef('image')} onChange={(e) => handleFileChange(e, setImage, validateImageSize)} />}
            {requiresAudio && <AdminFileInput label={t.audioLabel} hint={t.audioHint} accept="audio/*" ref={registerFileRef('audio')} onChange={(e) => handleFileChange(e, setAudio, validateAudioSize)} />}
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

        <button type="submit" className={`btn-primary admin-submit-btn ${editingId ? 'editing' : 'creating'}`} disabled={isProcessing || entryMode === 'json'}>
          {isProcessing ? t.processingData : editingId ? t.updateEvidence : t.commitEvidence}
        </button>
      </form>
    </EntityDashboard>
  );
}
