import React, { useCallback } from 'react';
import type { TerminalDocument, TerminalBlock } from '@/types/evidence/terminal';
import TerminalSheet from '@/pages/GameRoom/tabs/EvidenceBoard/TerminalViewer/TerminalSheet';
import styles from './Canvas.module.css';

interface CanvasProps {
  doc: TerminalDocument;
  selectedBlockId: string | null;
  onBlockSelect: (id: string | null) => void;
}

export function Canvas({ doc, selectedBlockId, onBlockSelect }: CanvasProps) {
  const cellWrapper = useCallback((content: React.ReactNode, block: TerminalBlock) => (
    <div
      className={`${styles.blockWrapper} ${block.id === selectedBlockId ? styles.selected : ''}`}
      onClick={() => onBlockSelect(block.id)}
    >
      {content}
      {block.id === selectedBlockId && <div className={styles.selectionIndicator} />}
    </div>
  ), [selectedBlockId, onBlockSelect]);

  return (
    <div className={styles.canvas}>
      <TerminalSheet
        doc={doc}
        evidenceId={0}
        fluid
        cellWrapper={cellWrapper}
        interactiveOverlay
      />
    </div>
  );
}