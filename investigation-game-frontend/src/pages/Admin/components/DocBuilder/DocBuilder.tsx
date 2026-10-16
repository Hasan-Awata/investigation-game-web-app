import { useState, useCallback } from 'react';
import { DndContext } from '@dnd-kit/core';
import { BuilderShell } from '@/pages/Admin/components/BlockBuilder/BuilderShell';
import { BlockPalette } from './BlockPalette';
import { DocCanvas } from './DocCanvas';
import { Inspector } from './Inspector';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { useBlockBuilder } from '@/pages/Admin/components/BlockBuilder/useBlockBuilder';
import { createBlock, cloneBlock, emptyDoc } from './blockFactory';
import { DOC_THEMES, type DocTheme, type DocDocument } from '@/types/evidence/doc';
import { templates, type TemplateName } from '@/pages/GameRoom/tabs/EvidenceBoard/DocViewer/templates-index';
import { uploadAdminBlockImage } from '@/services/adminApi';
import toast from 'react-hot-toast';
import styles from './DocBuilder.module.css';

interface DocBuilderProps {
  doc: DocDocument;
  onChange: (doc: DocDocument) => void;
  caseId: number | string;
  storeLocally: boolean;
  evidenceId: number;
}

export function DocBuilder({ doc, onChange, caseId, storeLocally, evidenceId }: DocBuilderProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.docBuilder;

  const [theme, setTheme] = useState<DocTheme>(doc.theme);
  const [pagePad, setPagePad] = useState(doc.page.pad);

  const resolveTemplate = useCallback((name: string) => {
    const templateDoc = templates[name as TemplateName]?.();
    if (!templateDoc) return null;
    return { blocks: templateDoc.blocks, theme: templateDoc.theme };
  }, []);

  const {
    sensors,
    collisionDetection,
    dndHandlers,
    selectedBlockId,
    selectedBlock,
    selectBlock,
    selectTemplate,
    updateBlock,
    removeBlock,
    duplicateBlock,
    clear,
  } = useBlockBuilder({
    doc,
    onChange,
    createBlock: createBlock as (type: string) => DocDocument['blocks'][0],
    cloneBlock,
    resolveTemplate,
    emptyDoc: emptyDoc as () => DocDocument,
    clearConfirmMessage: t.clearConfirm,
  });

  const handleThemeChange = useCallback((newTheme: DocTheme) => {
    setTheme(newTheme);
    onChange({ ...doc, theme: newTheme });
  }, [doc, onChange]);

  const handlePagePadChange = useCallback((pad: number) => {
    setPagePad(pad);
    onChange({ ...doc, page: { ...doc.page, pad } });
  }, [doc, onChange]);

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
        updateBlock(blockId, { props: { ...doc.blocks.find(b => b.id === blockId)!.props, url: result.value.url } });
        toast.success(t.uploadSuccess);
      } else {
        toast.error(result.errorMessage || t.uploadError);
      }
    };
    input.click();
  };

  const toolbar = (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <label className={styles.toolbarLabel}>{t.template}</label>
        <select
          className={styles.toolbarSelect}
          defaultValue=""
          onChange={(e) => e.target.value && selectTemplate(e.target.value as TemplateName)}
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
      <button type="button" className={styles.clearBtn} onClick={clear}>
        {t.clear}
      </button>
    </div>
  );

  const palette = <BlockPalette />;

  const canvas = (
    <DocCanvas
      doc={doc}
      evidenceId={evidenceId}
      selectedBlockId={selectedBlockId}
      onBlockSelect={selectBlock}
    />
  );

  const inspector = (
    <Inspector
      block={selectedBlock}
      onUpdate={updateBlock}
      onRemove={removeBlock}
      onDuplicate={duplicateBlock}
      onUploadImage={handleImageUpload}
      evidenceId={evidenceId}
      t={t}
    />
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={dndHandlers.onDragStart}
      onDragOver={dndHandlers.onDragOver}
    >
      <BuilderShell
        variant="stacked"
        toolbar={toolbar}
        palette={palette}
        canvas={canvas}
        inspector={inspector}
      />
    </DndContext>
  );
}