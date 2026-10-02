import type { TerminalDocument } from '@/types/evidence/terminal';
import { getBlockComponent } from '@/pages/GameRoom/tabs/EvidenceBoard/TerminalViewer/blocks';
import styles from './Canvas.module.css';

interface CanvasProps {
  doc: TerminalDocument;
  selectedBlockId: string | null;
  onBlockSelect: (id: string | null) => void;
}

export function Canvas({ doc, selectedBlockId, onBlockSelect }: CanvasProps) {
  return (
    <div className={styles.canvas}>
      <div className="tb-grid" role="list" aria-label="Terminal session">
        {doc.blocks.map((block) => {
          const Comp = getBlockComponent(block.type);
          const isSelected = block.id === selectedBlockId;

          return (
            <div
              key={block.id}
              className={`${styles.blockWrapper} ${isSelected ? styles.selected : ''}`}
              onClick={() => onBlockSelect(block.id)}
              role="listitem"
            >
              {isSelected && <div className={styles.selectionIndicator} />}
              <Comp block={block} ctx={{ evidenceId: 0 }} />
            </div>
          );
        })}
        {doc.blocks.length === 0 && (
          <div className={styles.emptyState}>
            <p>Drop blocks here or select from palette</p>
          </div>
        )}
      </div>
    </div>
  );
}