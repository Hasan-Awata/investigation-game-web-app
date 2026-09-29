import { useState, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragOverEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BlockPalette } from './BlockPalette';
import { DocCanvas } from './DocCanvas';
import { Inspector } from './Inspector';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { DOC_THEMES, type DocTheme, type DocDocument, type DocBlock, nextBlockId, DEFAULT_DOC, DEFAULT_PAGE } from '@/types/evidence/doc';
import { templates, type TemplateName } from '@/pages/GameRoom/tabs/EvidenceBoard/DocViewer/templates-index';
import { uploadAdminBlockImage } from '@/services/adminApi';
import toast from 'react-hot-toast';
import styles from './DocBuilder.module.css';

interface DocBuilderProps {
  doc: DocDocument;
  onChange: (doc: DocDocument) => void;
  caseId: number | string;
  storeLocally: boolean;
}

export function DocBuilder({ doc, onChange, caseId, storeLocally }: DocBuilderProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.docBuilder;

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [theme, setTheme] = useState<DocTheme>(doc.theme);
  const [pagePad, setPagePad] = useState(doc.page.pad);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { type: string; template?: TemplateName };
    if (data.template) {
      const templateDoc = templates[data.template]();
      const blocks = templateDoc.blocks.map(b => ({ ...b, id: nextBlockId() })) as DocBlock[];
      onChange({ ...doc, blocks: [...doc.blocks, ...blocks], theme: templateDoc.theme });
    } else if (data.type) {
      const newBlock = createBlock(data.type);
      onChange({ ...doc, blocks: [...doc.blocks, newBlock] });
    }
  }, [doc, onChange]);

  const handleTemplateSelect = useCallback((templateName: TemplateName) => {
    const templateDoc = templates[templateName]();
    const blocks = templateDoc.blocks.map(b => ({ ...b, id: nextBlockId() })) as DocBlock[];
    onChange({ ...doc, blocks: [...doc.blocks, ...blocks], theme: templateDoc.theme });
  }, [doc, onChange]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) return;
    const activeId = event.active.id as string;
    const overId = event.over.id as string;
    if (activeId === overId) return;

    const activeIndex = doc.blocks.findIndex(b => b.id === activeId);
    const overIndex = doc.blocks.findIndex(b => b.id === overId);
    if (activeIndex === -1 || overIndex === -1) return;

    const newBlocks = [...doc.blocks] as DocBlock[];
    const [removed] = newBlocks.splice(activeIndex, 1);
    newBlocks.splice(overIndex, 0, removed);
    onChange({ ...doc, blocks: newBlocks });
  }, [doc, onChange]);

  const handleBlockSelect = useCallback((id: string | null) => {
    setSelectedBlockId(id);
  }, []);

  const handleBlockUpdate = useCallback((id: string, updates: Partial<DocBlock>) => {
    onChange({
      ...doc,
      blocks: doc.blocks.map(b => b.id === id ? { ...b, ...updates } : b) as DocBlock[]
    });
  }, [doc, onChange]);

  const handleBlockRemove = useCallback((id: string) => {
    onChange({
      ...doc,
      blocks: doc.blocks.filter(b => b.id !== id)
    });
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [doc, onChange, selectedBlockId]);

  const handleBlockDuplicate = useCallback((id: string) => {
    const block = doc.blocks.find(b => b.id === id);
    if (!block) return;
    const newBlock = { ...block, id: nextBlockId() };
    const index = doc.blocks.findIndex(b => b.id === id);
    const newBlocks = [...doc.blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange({ ...doc, blocks: newBlocks });
  }, [doc, onChange]);

  const handleThemeChange = useCallback((newTheme: DocTheme) => {
    setTheme(newTheme);
    onChange({ ...doc, theme: newTheme });
  }, [doc, onChange]);

  const handlePagePadChange = useCallback((pad: number) => {
    setPagePad(pad);
    onChange({ ...doc, page: { ...doc.page, pad } });
  }, [doc, onChange]);

  const handleClear = useCallback(() => {
    if (!window.confirm(t.clearConfirm)) return;
    onChange({ ...DEFAULT_DOC, theme, page: { ...DEFAULT_PAGE, pad: pagePad }, blocks: [] });
    setSelectedBlockId(null);
  }, [t, onChange, theme, pagePad]);

  const handleImageUpload = async (blockId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('case_id', caseId.toString());
      formData.append('image', file);
      formData.append('store_locally', storeLocally.toString());
      const result = await uploadAdminBlockImage(formData);
      if (result.isSuccess) {
        handleBlockUpdate(blockId, { props: { ...doc.blocks.find(b => b.id === blockId)!.props, url: result.value.url } });
        toast.success(t.uploadSuccess);
      } else {
        toast.error(t.uploadError || result.errorMessage || 'Upload failed');
      }
    };
    input.click();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
    >
      <SortableContext items={doc.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.builder}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarGroup}>
              <label className={styles.toolbarLabel}>{t.template}</label>
              <select
                className={styles.toolbarSelect}
                defaultValue=""
                onChange={(e) => e.target.value && handleTemplateSelect(e.target.value as TemplateName)}
              >
                <option value="">{t.templatePlaceholder}</option>
                {(Object.keys(templates) as TemplateName[]).map(name => {
                  const labelKey = `doc${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof typeof adminT.forms.evidenceMetadata;
                  const labelValue = adminT.forms.evidenceMetadata[labelKey];
                  const label = typeof labelValue === 'string' ? labelValue : name;
                  return <option key={name} value={name}>{label}</option>;
                })}
              </select>
            </div>
            <div className={styles.toolbarGroup}>
              <label className={styles.toolbarLabel}>{t.theme}</label>
              <select
                className={styles.toolbarSelect}
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as DocTheme)}
              >
                {DOC_THEMES.map(th => (
                  <option key={th} value={th}>{th.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className={styles.toolbarGroup}>
              <label className={styles.toolbarLabel}>{t.pagePad}</label>
              <input
                type="number"
                className={styles.toolbarInput}
                value={pagePad}
                onChange={(e) => handlePagePadChange(Number(e.target.value))}
                min={0}
                max={200}
              />
            </div>
            <div className={styles.toolbarGroup}>
              <label className={styles.toolbarLabel}>{t.blocksWord}: {doc.blocks.length}</label>
            </div>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              {t.clear}
            </button>
          </div>

          <div className={styles.panes}>
            <aside className={styles.palettePane}>
              <BlockPalette />
            </aside>

            <main className={styles.canvasPane}>
              <DocCanvas
                doc={doc}
                selectedBlockId={selectedBlockId}
                onBlockSelect={handleBlockSelect}
              />
            </main>

            <aside className={styles.inspectorPane}>
              <Inspector
                block={selectedBlockId ? doc.blocks.find(b => b.id === selectedBlockId) || null : null}
                onUpdate={handleBlockUpdate}
                onRemove={handleBlockRemove}
                onDuplicate={handleBlockDuplicate}
                onUploadImage={handleImageUpload}
                evidenceId={0}
                t={t}
              />
            </aside>
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function createBlock(type: string): DocBlock {
  const base = { id: nextBlockId(type.slice(0, 2)), span: 12, style: {} };
  switch (type) {
    case 'letterhead':
      return { ...base, type: 'letterhead', props: { agency: '', title: '', sub: '' } } as DocBlock;
    case 'meta_grid':
      return { ...base, type: 'meta_grid', props: { rows: [], columns: 2 } } as DocBlock;
    case 'prose':
      return { ...base, type: 'prose', props: { html: '', tone: 'typed' } } as DocBlock;
    case 'two_column':
      return { ...base, type: 'two_column', props: { left: [], right: [], gap: 16 } } as DocBlock;
    case 'table':
      return { ...base, type: 'table', props: { columns: [], rows: [], tone: 'ledger' } } as DocBlock;
    case 'list':
      return { ...base, type: 'list', props: { items: [], ordered: false } } as DocBlock;
    case 'signature_row':
      return { ...base, type: 'signature_row', props: { columns: [{ caption: '' }] } } as DocBlock;
    case 'stamp':
      return { ...base, type: 'stamp', props: { text: '', tone: 'official' } } as DocBlock;
    case 'barcode':
      return { ...base, type: 'barcode', props: { value: '' } } as DocBlock;
    case 'watermark':
      return { ...base, type: 'watermark', props: { text: '', rotate: -15 } } as DocBlock;
    case 'rule':
      return { ...base, type: 'rule', props: { variant: 'solid' } } as DocBlock;
    case 'spacer':
      return { ...base, type: 'spacer', props: { height: 24 } } as DocBlock;
    case 'image':
      return { ...base, type: 'image', props: { url: '', filter: 'plain' } } as DocBlock;
    case 'annotation':
      return { ...base, type: 'annotation', props: { text: '', rotate: -3 } } as DocBlock;
    case 'redaction':
      return { ...base, type: 'redaction', props: { lines: 1 } } as DocBlock;
    case 'diagram':
      return { ...base, type: 'diagram', props: { preset: 'body_outline' } } as DocBlock;
    default:
      return { ...base, type: 'prose', props: { html: '', tone: 'typed' } } as DocBlock;
  }
}