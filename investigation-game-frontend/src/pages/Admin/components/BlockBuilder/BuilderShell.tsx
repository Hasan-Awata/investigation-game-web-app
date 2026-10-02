import type { ReactNode } from 'react';
import styles from './BuilderShell.module.css';

interface BuilderShellProps {
  toolbar?: ReactNode;
  palette?: ReactNode;
  canvas?: ReactNode;
  inspector?: ReactNode;
}

export function BuilderShell({ toolbar, palette, canvas, inspector }: BuilderShellProps) {
  return (
    <div className={styles.builder}>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <div className={styles.panes}>
        {palette && <aside className={styles.palettePane}>{palette}</aside>}
        {canvas && <main className={styles.canvasPane}>{canvas}</main>}
        {inspector && <aside className={styles.inspectorPane}>{inspector}</aside>}
      </div>
    </div>
  );
}