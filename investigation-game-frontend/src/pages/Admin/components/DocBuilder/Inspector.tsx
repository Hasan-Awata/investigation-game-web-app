import type { DocBlock, DocBlockType, DocBlockStyle } from '@/types/evidence/doc';
import { AdminInput, AdminSelect, AdminRow } from '@/pages/Admin/components/AdminUI';
import { LetterheadEditor } from './blocks/LetterheadEditor';
import { MetaGridEditor } from './blocks/MetaGridEditor';
import { ProseEditor } from './blocks/ProseEditor';
import { TwoColumnEditor } from './blocks/TwoColumnEditor';
import { TableEditor } from './blocks/TableEditor';
import { ListEditor } from './blocks/ListEditor';
import { SignatureRowEditor } from './blocks/SignatureRowEditor';
import { StampEditor } from './blocks/StampEditor';
import { BarcodeEditor } from './blocks/BarcodeEditor';
import { WatermarkEditor } from './blocks/WatermarkEditor';
import { RuleEditor } from './blocks/RuleEditor';
import { SpacerEditor } from './blocks/SpacerEditor';
import { ImageEditor } from './blocks/ImageEditor';
import { AnnotationEditor } from './blocks/AnnotationEditor';
import { RedactionEditor } from './blocks/RedactionEditor';
import { DiagramEditor } from './blocks/DiagramEditor';
import styles from './Inspector.module.css';

interface InspectorProps {
  block: DocBlock | null;
  onUpdate: (id: string, updates: Partial<DocBlock>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUploadImage: (blockId: string) => void;
  evidenceId: number;
  t: {
    inspectorTitle: string;
    inspectorEmpty: string;
    duplicate: string;
    remove: string;
    uploadImage: string;
    spanLabel: string;
    alignLabel: string;
    toneLabel: string;
    padLabel: string;
    blocks: Record<string, string>;
  };
}

const EDITORS: Record<DocBlockType, (props: { block: DocBlock; onUpdate: (updates: Partial<DocBlock>) => void; onUploadImage?: (blockId: string) => void; evidenceId: number }) => React.ReactElement> = {
  letterhead: LetterheadEditor,
  meta_grid: MetaGridEditor,
  prose: ProseEditor,
  two_column: TwoColumnEditor,
  table: TableEditor,
  list: ListEditor,
  signature_row: SignatureRowEditor,
  stamp: StampEditor,
  barcode: BarcodeEditor,
  watermark: WatermarkEditor,
  rule: RuleEditor,
  spacer: SpacerEditor,
  image: ImageEditor,
  annotation: AnnotationEditor,
  redaction: RedactionEditor,
  diagram: DiagramEditor,
};

export function Inspector({ block, onUpdate, onRemove, onDuplicate, onUploadImage, evidenceId, t }: InspectorProps) {
  if (!block) {
    return (
      <div className={styles.inspector}>
        <h3 className={styles.title}>{t.inspectorTitle}</h3>
        <div className={styles.empty}>{t.inspectorEmpty}</div>
      </div>
    );
  }

  const Editor = EDITORS[block.type];

  const handleBaseUpdate = (updates: Partial<DocBlock>) => {
    onUpdate(block.id, updates);
  };

  const handleStyleUpdate = (styleUpdates: Partial<DocBlockStyle>) => {
    onUpdate(block.id, { style: { ...block.style, ...styleUpdates } });
  };

  return (
    <div className={styles.inspector}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {t.blocks[block.type] || block.type}
          <span className={styles.badge}>{block.type}</span>
        </h3>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => onDuplicate(block.id)}>{t.duplicate}</button>
          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => onRemove(block.id)}>{t.remove}</button>
        </div>
      </div>

      <div className={styles.baseProps}>
        <AdminRow>
          <AdminInput
            label={t.spanLabel}
            type="number"
            value={block.span || 12}
            onChange={(e) => handleBaseUpdate({ span: Number(e.target.value) })}
            min={1}
            max={12}
          />
          <AdminSelect
            label={t.alignLabel}
            value={block.style?.align || 'start'}
            onChange={(e) => handleStyleUpdate({ align: e.target.value as 'start' | 'center' | 'end' })}
            options={[
              { label: 'Start', value: 'start' },
              { label: 'Center', value: 'center' },
              { label: 'End', value: 'end' },
            ]}
          />
        </AdminRow>
        <AdminRow>
          <AdminInput
            label={t.toneLabel}
            value={block.style?.tone || ''}
            onChange={(e) => handleStyleUpdate({ tone: e.target.value })}
            placeholder="tone variant"
          />
          <AdminInput
            label={t.padLabel}
            type="number"
            value={block.style?.pad || 0}
            onChange={(e) => handleStyleUpdate({ pad: Number(e.target.value) })}
            min={0}
            max={100}
          />
        </AdminRow>
      </div>

      <div className={styles.editorWrapper}>
        <Editor
          block={block}
          onUpdate={handleBaseUpdate}
          onUploadImage={onUploadImage}
          evidenceId={evidenceId}
        />
      </div>
    </div>
  );
}