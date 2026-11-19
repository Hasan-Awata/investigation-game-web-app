import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import TemplateRenderer, { PAPER_WIDTH } from '@/features/evidence/presentation/TemplateRenderer';
import { latestTemplates, templateDefinition, upgradeValues } from '@/features/evidence/presentation/catalog';
import type { ScalarField, Template } from '@/features/evidence/model';
import { useConfirm } from '@/pages/Admin/components/AdminUI/ConfirmContext';
import MediaUploader from '@/pages/Admin/components/MediaUploader';
import type { ValidationErrors } from '@/utils/Result';
import admin from '../../AdminDashboard.module.css';
import styles from './TemplateEditor.module.css';

interface Props {
  type: string;
  template?: Template;
  legacy: boolean;
  legacyPreview?: ReactNode;
  files: Record<string, File>;
  errors: ValidationErrors;
  characters: { id: number; name: string; img_url?: string | null }[];
  onChange: (template: Template, files: Record<string, File>) => void;
}

export default function TemplateEditor({ type, template, legacy, legacyPreview, files, errors, characters, onChange }: Props) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const tr = (en: string, ar: string) => locale === 'ar' ? ar : en;
  const confirm = useConfirm();
  const fieldId = useId();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(0.5);
  const preview = useRef<HTMLDivElement>(null);
  const imageInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const choices = latestTemplates(type);
  const definition = template && templateDefinition(template.id, template.version);
  const latest = choices.find(entry => entry.id === template?.id);
  const filtered = choices.filter(entry => [entry.name.en, entry.name.ar, entry.category.en, entry.category.ar].some(text => text.toLowerCase().includes(query.trim().toLowerCase())));

  useEffect(() => {
    if (Object.keys(files).length === 0) return;
    const created = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, URL.createObjectURL(file)]));
    const frame = requestAnimationFrame(() => setUrls(created));
    return () => {
      cancelAnimationFrame(frame);
      Object.values(created).forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    const element = preview.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setZoom(Math.min(1, entry.contentRect.width / PAPER_WIDTH)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [definition, legacy]);

  const update = (key: string, value: Template['values'][string]) => {
    if (template) onChange({ ...template, values: { ...template.values, [key]: value } }, files);
  };

  const select = async (id: string) => {
    const target = choices.find(entry => entry.id === id);
    if (!target || target.id === template?.id) return;
    if ((template || legacy) && !await confirm({ message: tr('Replace this document with the selected template?', 'هل تريد استبدال هذا المستند بالقالب المحدد؟') })) return;
    setNotice('');
    onChange({ id: target.id, version: target.version, values: {} }, {});
  };

  const prefill = async (characterId: string) => {
    const character = characters.find(entry => String(entry.id) === characterId);
    const mapping = definition?.characterPrefill;
    if (!character || !template || !mapping) return;
    const { name, portrait: portraitField } = mapping;
    if ((template.values[name] || (portraitField && (template.values[portraitField] || files[portraitField]))) &&
      !await confirm({ message: tr('Replace the fields copied from the case character?', 'هل تريد استبدال الحقول المنسوخة من شخصية القضية؟') })) return;
    const portrait = portraitField ? character.img_url || '' : '';
    const managed = /\/assets\/cases\/\d+-|^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?cases\/\d+-/.test(portrait);
    setNotice(portrait && !managed ? tr('Upload a managed copy of this photograph to include it.', 'ارفع نسخة من هذه الصورة لإضافتها إلى المستند.') : '');
    const remainingFiles = { ...files };
    const values = { ...template.values, [name]: character.name };
    if (portraitField) {
      delete remainingFiles[portraitField];
      const input = imageInputs.current[portraitField];
      if (input) input.value = '';
      values[portraitField] = managed ? portrait : '';
    }
    onChange({ ...template, values }, remainingFiles);
  };

  const issue = (path: string, id?: string) => errors[path]?.length ? <span className={styles.error} id={id} role="alert">{errors[path].join(' ')}</span> : null;
  const scalar = (field: ScalarField, value: string, change: (value: string) => void, id: string, path: string) => {
    const errorId = `${id}-error`;
    const invalid = Boolean(errors[path]?.length);
    const accessibility = { 'aria-invalid': invalid, 'aria-describedby': invalid ? errorId : undefined };
    const editor = field.kind === 'textarea'
      ? <textarea id={id} className={admin['admin-input']} dir="auto" {...accessibility} required={field.required} maxLength={field.max} rows={5} value={value} onChange={event => change(event.target.value)} />
      : <input id={id} className={admin['admin-input']} dir={field.kind === 'date' ? 'ltr' : 'auto'} {...accessibility} required={field.required} maxLength={field.max} type={field.kind === 'date' ? 'date' : 'text'} value={value} onChange={event => change(event.target.value)} />;
    return <label key={field.key} htmlFor={id}>{field.label[locale]}{field.required && ' *'}{editor}{issue(path, errorId)}</label>;
  };

  return <div className={styles.editor}>
    <div className={styles.fields}>
      <label>{tr('Find a template', 'البحث عن قالب')}<input className={admin['admin-input']} type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label>{tr('Evidence template', 'قالب الدليل')}
        <select className={admin['admin-input']} value={template?.id ?? ''} onChange={e => void select(e.target.value)}>
          <option value="" disabled>{tr('Choose a template', 'اختر قالبًا')}</option>
          {Array.from(new Set(filtered.map(entry => entry.category[locale]))).sort().map(category => <optgroup key={category} label={category}>
            {filtered.filter(entry => entry.category[locale] === category).sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale)).map(entry => <option key={entry.id} value={entry.id}>{entry.name[locale]}</option>)}
          </optgroup>)}
          {definition && !filtered.some(entry => entry.id === definition.id) && <option value={definition.id}>{definition.name[locale]}</option>}
        </select>
      </label>
      {['metadata.template', 'metadata.template.id', 'metadata.template.version'].map(path => <div key={path} hidden={!errors[path]?.length}>{issue(path)}</div>)}
      {!filtered.length && <p role="status">{tr('No templates match your search.', 'لا توجد قوالب تطابق البحث.')}</p>}
      {legacy && <p role="status">{tr('This evidence uses the old layout. Review it in the preview before choosing a replacement.', 'يستخدم هذا الدليل التنسيق السابق. راجع المعاينة قبل اختيار بديل.')}</p>}
      {template && definition && <>
        {latest && latest.version > template.version && <button type="button" onClick={() => {
          const retainedFiles = Object.fromEntries(Object.entries(files).filter(([key]) => latest.fields.some(field => field.key === key && field.kind === 'image')));
          onChange({ id: latest.id, version: latest.version, values: upgradeValues(definition, latest, template.values) }, retainedFiles);
        }}>{tr('Review template upgrade', 'مراجعة ترقية القالب')}</button>}
        {characters.length > 0 && definition.characterPrefill && <label>{tr('Copy from a case character', 'نسخ معلومات شخصية من القضية')}
          <select className={admin['admin-input']} value="" onChange={e => void prefill(e.target.value)}>
            <option value="">{tr('Choose a character', 'اختر شخصية')}</option>
            {characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
          </select>
        </label>}
        {notice && <p role="status">{notice}</p>}
        {definition.fields.map(field => {
          const value = template.values[field.key];
          const id = `${fieldId}-${field.key}`;
          const path = `metadata.template.values.${field.key}`;
          if (field.kind === 'image') return <div key={id}>
            <MediaUploader key={`${definition.id}:${definition.version}:${field.key}`} ref={input => { imageInputs.current[field.key] = input; }} label={field.label[locale]} accept="image/*" onChange={file => {
              const next = { ...files };
              if (file) {
                next[field.key] = file;
                if (field.key === definition.characterPrefill?.portrait) setNotice('');
              }
              else delete next[field.key];
              onChange(template, next);
            }} />
            {issue(path)}{issue(`template_images.${field.key}`)}
            {(value || files[field.key]) && <button type="button" onClick={() => {
              const next = { ...files };
              delete next[field.key];
              const input = imageInputs.current[field.key];
              if (input) input.value = '';
              onChange({ ...template, values: { ...template.values, [field.key]: '' } }, next);
            }}>{tr('Remove image', 'إزالة الصورة')}</button>}
          </div>;
          if (field.kind !== 'rows') return scalar(field, typeof value === 'string' ? value : '', next => update(field.key, next), id, path);
          const rows = Array.isArray(value) ? value : [];
          return <fieldset key={id} className={styles.rows}>
            <legend>{field.label[locale]}</legend>
            {issue(path)}
            {rows.map((row, index) => <div key={index} className={styles.row}>
              {field.fields.map(column => scalar(column, row[column.key] || '', next => update(field.key, rows.map((entry, position) => position === index ? { ...entry, [column.key]: next } : entry)), `${id}-${index}-${column.key}`, `${path}.${index}.${column.key}`))}
              <button type="button" onClick={() => update(field.key, rows.filter((_, position) => position !== index))}>{tr(`Remove row ${index + 1}`, `إزالة الصف ${index + 1}`)}</button>
            </div>)}
            <button type="button" disabled={rows.length >= field.max} onClick={() => update(field.key, [...rows, {}])}>{tr('Add row', 'إضافة صف')}</button>
          </fieldset>;
        })}
      </>}
    </div>
    {(template || legacy) && <section className={styles.preview} ref={preview} aria-label={tr('Evidence preview', 'معاينة الدليل')}>
      <div style={{ zoom: zoom || 0.5 }}>{template ? <TemplateRenderer template={{ ...template, values: { ...template.values, ...Object.fromEntries(Object.entries(urls).filter(([key]) => files[key])) } }} /> : legacyPreview}</div>
    </section>}
  </div>;
}
