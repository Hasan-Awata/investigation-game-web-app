import type { ReactNode } from 'react';
import styles from './BuilderShell.module.css';

interface BuilderShellProps {
  toolbar?: ReactNode;
  palette?: ReactNode;
  canvas?: ReactNode;
  inspector?: ReactNode;
  /**
   * Panes arrangement. `columns` (default) is the classic palette | canvas |
   * inspector three-column grid used by the terminal builder. `stacked` keeps
   * the palette as a left sidebar but drops the inspector below the canvas, so
   * the canvas gets the full remaining width -- needed by the document builder
   * to render a true A4 sheet.
   */
  variant?: 'columns' | 'stacked';
}

export function BuilderShell({ toolbar, palette, canvas, inspector, variant = 'columns' }: BuilderShellProps) {
  const stacked = variant === 'stacked';
  return (
    <div className={`${styles.builder} ${stacked ? styles.builderStacked : ''}`}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <div className={`${styles.panes} ${stacked ? styles.panesStacked : ''}`}>
        {palette && <aside className={styles.palettePane}>{palette}</aside>}
        {canvas && <main className={styles.canvasPane}>{canvas}</main>}
        {inspector && <aside className={styles.inspectorPane}>{inspector}</aside>}
      </div>
    </div>
  );
}