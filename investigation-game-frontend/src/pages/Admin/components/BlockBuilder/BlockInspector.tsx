import type { FC } from 'react';
import type { DocBlock } from '@/types/evidence/doc';
import type { TerminalBlock } from '@/types/evidence/terminal';
import type { BlockAlign } from '@/types/evidence/shared';
import { clampSpan } from '@/types/evidence/shared';
import styles from './BlockInspector.module.css';

type AnyBlock = DocBlock | TerminalBlock;

interface DocEditorProps {
  block: DocBlock;
  onUpdate: (updates: Partial<DocBlock>) => void;
  evidenceId: number;
}

interface TerminalEditorProps {
  block: TerminalBlock;
  onUpdate: (updates: Partial<TerminalBlock>) => void;
  evidenceId: number;
}

type AnyEditor = FC<DocEditorProps> | FC<TerminalEditorProps>;

interface InspectorTranslations {
  inspectorTitle: string;
  inspectorEmpty: string;
  duplicate: string;
  remove: string;
  spanLabel: string;
  alignLabel: string;
  toneLabel: string;
  padLabel: string;
  uploadImage?: string;
  alignStart?: string;
  alignCenter?: string;
  alignEnd?: string;
}

interface BlockInspectorProps {
  block: AnyBlock | null;
  onUpdate: (id: string, updates: Partial<AnyBlock>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUploadImage?: (blockId: string) => void;
  evidenceId: number;
  editors: Record<string, AnyEditor>;
  t: InspectorTranslations;
}

export function BlockInspector({
  block,
  onUpdate,
  onRemove,
  onDuplicate,
  onUploadImage,
  evidenceId,
  editors,
  t,
}: BlockInspectorProps) {
  if (!block) {
    return (
      <div className={styles.inspector}>
        <h4 className={styles.inspectorTitle}>{t.inspectorTitle}</h4>
        <p className={styles.inspectorEmpty}>{t.inspectorEmpty}</p>
      </div>
    );
  }

  const Editor = editors[block.type];
  const span = clampSpan(block.span);
  const align = (block.style?.align as BlockAlign) ?? 'start';
  const tone = (block.style?.tone as string) ?? '';
  const pad = (block.style?.pad as number) ?? 0;

  const handleSpanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(block.id, { span: Number(e.target.value) });
  };

  const handleAlignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(block.id, { style: { ...block.style, align: e.target.value as BlockAlign } });
  };

  const handleToneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(block.id, { style: { ...block.style, tone: e.target.value } });
  };

  const handlePadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(block.id, { style: { ...block.style, pad: Number(e.target.value) } });
  };

  return (
    <div className={styles.inspector}>
      <header className={styles.inspectorHeader}>
        <h4 className={styles.inspectorTitle}>{t.inspectorTitle}</h4>
        <div className={styles.inspectorActions}>
          <button className={styles.inspectorBtn} onClick={() => onDuplicate(block.id)}>{t.duplicate}</button>
          <button className={styles.inspectorBtn} onClick={() => onRemove(block.id)}>{t.remove}</button>
        </div>
      </header>

      <div className={styles.inspectorFields}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t.spanLabel}</label>
          <select className={styles.fieldSelect} value={span} onChange={handleSpanChange}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>{n}/12</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t.alignLabel}</label>
          <select className={styles.fieldSelect} value={align} onChange={handleAlignChange}>
            <option value="start">{t.alignStart ?? 'Start'}</option>
            <option value="center">{t.alignCenter ?? 'Center'}</option>
            <option value="end">{t.alignEnd ?? 'End'}</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t.toneLabel}</label>
          <input className={styles.fieldInput} type="text" value={tone} onChange={handleToneChange} placeholder="tone variant" />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t.padLabel}</label>
          <input className={styles.fieldInput} type="number" value={pad} onChange={handlePadChange} min="0" max="100" />
        </div>
      </div>

      {Editor && (
        <div className={styles.editorWrapper}>
          <Editor block={block as any} onUpdate={(updates) => onUpdate(block.id, updates)} evidenceId={evidenceId} />
        </div>
      )}

      {onUploadImage && block.type === 'image' && (
        <div className={styles.uploadWrapper}>
          <button className={styles.uploadBtn} onClick={() => onUploadImage(block.id)}>
            {t.uploadImage ?? 'Upload Image'}
          </button>
        </div>
      )}
    </div>
  );
}