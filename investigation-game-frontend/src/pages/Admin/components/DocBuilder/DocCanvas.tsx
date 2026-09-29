import { useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { DocDocument, DocBlock } from '@/types/evidence/doc';
import DocSheet from '@/pages/GameRoom/tabs/EvidenceBoard/DocViewer/DocSheet';
import styles from './DocCanvas.module.css';

interface DocCanvasProps {
  doc: DocDocument;
  selectedBlockId: string | null;
  onBlockSelect: (id: string | null) => void;
}

export function DocCanvas({ doc, selectedBlockId, onBlockSelect }: DocCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: 'doc-canvas' });

  const handleBlockClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onBlockSelect(id);
  }, [onBlockSelect]);

  const handleCanvasClick = useCallback(() => {
    onBlockSelect(null);
  }, [onBlockSelect]);

  const cellWrapper = useCallback((content: React.ReactNode, block: DocBlock) => (
    <div
      className={`${styles.blockWrapper} ${selectedBlockId === block.id ? styles.selected : ''}`}
      onClick={(e) => handleBlockClick(block.id, e)}
    >
      {content}
      {selectedBlockId === block.id && (
        <div className={styles.selectionIndicator} aria-hidden="true" />
      )}
    </div>
  ), [selectedBlockId, handleBlockClick]);

  return (
    <div
      ref={(el) => { canvasRef.current = el; setNodeRef(el); }}
      className={`${styles.canvas} ${isOver ? styles.dropActive : ''}`}
      onClick={handleCanvasClick}
    >
      <DocSheet
        doc={doc}
        evidenceId={0}
        fluid={true}
        cellWrapper={cellWrapper}
        interactiveOverlay={true}
      />
    </div>
  );
}