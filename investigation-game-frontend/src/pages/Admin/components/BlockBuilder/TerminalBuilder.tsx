import { useState, useCallback } from 'react';
import { DndContext } from '@dnd-kit/core';
import { type DragStartEvent, type DragOverEvent } from '@dnd-kit/core';
import { TERMINAL_THEMES, type TerminalTheme, type TerminalDocument, type TerminalBlock, TERMINAL_BLOCK_TYPES } from '@/types/evidence/terminal';
import { useBlockBuilder } from './useBlockBuilder';
import { BuilderShell } from './BuilderShell';
import { BlockPalette } from './BlockPalette';
import { BlockInspector } from './BlockInspector';
import { Canvas } from './Canvas';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { createTerminalBlock, cloneTerminalBlock, resolveTerminalTemplate, emptyTerminalDoc } from './blocks/terminalBlockFactory';
import { TERMINAL_EDITORS } from './blocks/editors';
import { templates } from '@/pages/GameRoom/tabs/EvidenceBoard/TerminalViewer/templates-index';
import styles from './TerminalBuilder.module.css';

interface TerminalBuilderProps {
  doc: TerminalDocument;
  onChange: (doc: TerminalDocument) => void;
}

export function TerminalBuilder({ doc, onChange }: TerminalBuilderProps) {
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.terminalBuilder;

  const [theme, setTheme] = useState<TerminalTheme>(doc.theme);

  const { sensors, collisionDetection, dndHandlers, selectedBlock, selectedBlockId, selectBlock, selectTemplate, updateBlock: updateTerminalBlock, removeBlock, duplicateBlock } = useBlockBuilder<
    TerminalBlock,
    TerminalDocument
  >({
    doc,
    onChange,
    createBlock: (type: string) => createTerminalBlock(type as TerminalBlock['type']),
    cloneBlock: cloneTerminalBlock,
    resolveTemplate: resolveTerminalTemplate,
    emptyDoc: emptyTerminalDoc,
    clearConfirmMessage: t.clearConfirm,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    dndHandlers.onDragStart(event);
  }, [dndHandlers]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    dndHandlers.onDragOver(event);
  }, [dndHandlers]);

  const handleBlockSelect = useCallback((id: string | null) => {
    selectBlock(id);
  }, [selectBlock]);

  const handleThemeChange = useCallback((newTheme: TerminalTheme) => {
    setTheme(newTheme);
    onChange({ ...doc, theme: newTheme });
  }, [doc, onChange]);

  const handleTemplateSelect = useCallback((templateName: string) => {
    selectTemplate(templateName);
  }, [selectTemplate]);

  const updateBlock = useCallback((id: string, updates: Partial<any>) => {
    updateTerminalBlock(id, updates as Partial<TerminalBlock>);
  }, [updateTerminalBlock]);

  const handleClear = useCallback(() => {
    if (!window.confirm(t.clearConfirm)) return;
    onChange(emptyTerminalDoc());
  }, [t, onChange]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
    >
      <BuilderShell
        toolbar={
          <>
            <div className={styles.toolbarGroup}>
              <label className={styles.toolbarLabel}>{t.template}</label>
              <select
                className={styles.toolbarSelect}
                defaultValue=""
                onChange={(e) => e.target.value && handleTemplateSelect(e.target.value)}
              >
                <option value="">{t.templatePlaceholder}</option>
                {(Object.keys(templates) as Array<keyof typeof templates>).map((name) => {
                  const labelKey = `term${name.charAt(0).toUpperCase() + name.slice(1)}` as keyof typeof t;
                  const label = t[labelKey] as string || name;
                  return <option key={name} value={name}>{label}</option>;
                })}
              </select>
            </div>
            {TERMINAL_THEMES.length > 1 && (
              <div className={styles.toolbarGroup}>
                <label className={styles.toolbarLabel}>{t.theme}</label>
                <select
                  className={styles.toolbarSelect}
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value as TerminalTheme)}
                >
                  {TERMINAL_THEMES.map((th) => (
                    <option key={th} value={th}>{th}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.toolbarGroup}>
              <label className={styles.toolbarLabel}>{t.blocksWord}: {doc.blocks.length}</label>
            </div>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              {t.clear}
            </button>
          </>
        }
        palette={
          <BlockPalette
            blockTypes={TERMINAL_BLOCK_TYPES}
            getBlockLabel={(type) => t[`block${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof t] as string || type}
            getBlockIcon={() => null}
            onSelect={(type) => {
              const newBlock = createTerminalBlock(type);
              onChange({ ...doc, blocks: [...doc.blocks, newBlock] });
            }}
          />
        }
        canvas={
          <Canvas doc={doc} selectedBlockId={selectedBlockId} onBlockSelect={handleBlockSelect} />
        }
        inspector={
          <BlockInspector
            block={selectedBlock}
            onUpdate={updateBlock}
            onRemove={removeBlock}
            onDuplicate={duplicateBlock}
            evidenceId={0}
            editors={TERMINAL_EDITORS}
            t={adminT.forms.blockBuilder}
          />
        }
      />
    </DndContext>
  );
}