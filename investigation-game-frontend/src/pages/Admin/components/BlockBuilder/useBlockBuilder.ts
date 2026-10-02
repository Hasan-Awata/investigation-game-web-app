import { useCallback, useState } from 'react';
import { closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragOverEvent } from '@dnd-kit/core';
import type { BlockBase } from '@/types/evidence/shared';

interface UseBlockBuilderArgs<TBlock extends BlockBase, TDoc extends { blocks: TBlock[] }> {
  doc: TDoc;
  onChange: (doc: TDoc) => void;
  createBlock: (type: string) => TBlock;
  cloneBlock: (block: TBlock) => TBlock;
  resolveTemplate: (name: string) => { blocks: TBlock[]; theme?: string } | null;
  emptyDoc: () => TDoc;
  clearConfirmMessage: string;
}

interface UseBlockBuilderReturn<TBlock extends BlockBase> {
  sensors: ReturnType<typeof useSensors>;
  collisionDetection: typeof closestCenter;
  dndHandlers: {
    onDragStart: (event: DragStartEvent) => void;
    onDragOver: (event: DragOverEvent) => void;
  };
  selectedBlockId: string | null;
  selectedBlock: TBlock | null;
  selectBlock: (id: string | null) => void;
  selectTemplate: (templateName: string) => void;
  updateBlock: (id: string, updates: Partial<TBlock>) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  clear: () => void;
}

export function useBlockBuilder<TBlock extends BlockBase, TDoc extends { blocks: TBlock[] }>({
  doc,
  onChange,
  createBlock,
  cloneBlock,
  resolveTemplate,
  emptyDoc,
  clearConfirmMessage,
}: UseBlockBuilderArgs<TBlock, TDoc>): UseBlockBuilderReturn<TBlock> {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: () => ({ x: 0, y: 0 }) })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { type: string; template?: string };
    if (data.template) {
      const template = resolveTemplate(data.template);
      if (template) {
        const blocks = template.blocks.map((b) => cloneBlock(b)) as TBlock[];
        const newDoc = { ...doc, blocks: [...doc.blocks, ...blocks] } as TDoc;
        if (template.theme) {
          (newDoc as any).theme = template.theme;
        }
        onChange(newDoc);
      }
    } else if (data.type) {
      const newBlock = createBlock(data.type);
      onChange({ ...doc, blocks: [...doc.blocks, newBlock] } as TDoc);
    }
  }, [doc, onChange, createBlock, cloneBlock, resolveTemplate]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) return;
    const activeId = event.active.id as string;
    const overId = event.over.id as string;
    if (activeId === overId) return;

    const activeIndex = doc.blocks.findIndex((b) => b.id === activeId);
    const overIndex = doc.blocks.findIndex((b) => b.id === overId);
    if (activeIndex === -1 || overIndex === -1) return;

    const newBlocks = [...doc.blocks] as TBlock[];
    const [removed] = newBlocks.splice(activeIndex, 1);
    newBlocks.splice(overIndex, 0, removed);
    onChange({ ...doc, blocks: newBlocks } as TDoc);
  }, [doc, onChange]);

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
  }, []);

  const selectTemplate = useCallback((templateName: string) => {
    const template = resolveTemplate(templateName);
    if (template) {
      const blocks = template.blocks.map((b) => cloneBlock(b)) as TBlock[];
      const newDoc = { ...doc, blocks: [...doc.blocks, ...blocks] } as TDoc;
      if (template.theme) {
        (newDoc as any).theme = template.theme;
      }
      onChange(newDoc);
    }
  }, [doc, onChange, cloneBlock, resolveTemplate]);

  const updateBlock = useCallback((id: string, updates: Partial<TBlock>) => {
    onChange({
      ...doc,
      blocks: doc.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)) as TBlock[],
    } as TDoc);
  }, [doc, onChange]);

  const removeBlock = useCallback((id: string) => {
    onChange({
      ...doc,
      blocks: doc.blocks.filter((b) => b.id !== id),
    } as TDoc);
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [doc, onChange, selectedBlockId]);

  const duplicateBlock = useCallback((id: string) => {
    const block = doc.blocks.find((b) => b.id === id);
    if (!block) return;
    const newBlock = cloneBlock(block);
    const index = doc.blocks.findIndex((b) => b.id === id);
    const newBlocks = [...doc.blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange({ ...doc, blocks: newBlocks } as TDoc);
  }, [doc, onChange, cloneBlock]);

  const clear = useCallback(() => {
    if (!window.confirm(clearConfirmMessage)) return;
    onChange(emptyDoc());
    setSelectedBlockId(null);
  }, [onChange, emptyDoc, clearConfirmMessage]);

  const selectedBlock = selectedBlockId ? doc.blocks.find((b) => b.id === selectedBlockId) || null : null;

  return {
    sensors,
    collisionDetection: closestCenter,
    dndHandlers: { onDragStart: handleDragStart, onDragOver: handleDragOver },
    selectedBlockId,
    selectedBlock,
    selectBlock,
    selectTemplate,
    updateBlock,
    removeBlock,
    duplicateBlock,
    clear,
  };
}