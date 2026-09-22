import type { FC } from 'react';
import styles from './TerminalBlock.module.css';

export interface TerminalLine {
  type: 'command' | 'system' | 'output' | 'error';
  content: string;
}

export interface TerminalBlockProps {
  lines: TerminalLine[];
}

const TYPE_CLASS: Record<TerminalLine['type'], string> = {
  command: styles['line-command'],
  system: styles['line-system'],
  output: styles['line-output'],
  error: styles['line-error'],
};

const TerminalBlock: FC<TerminalBlockProps> = ({ lines }) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={`${styles.dot} ${styles['dot-red']}`}></span>
        <span className={`${styles.dot} ${styles['dot-yellow']}`}></span>
        <span className={`${styles.dot} ${styles['dot-green']}`}></span>
        <span className={styles.title}>ccu-server:~$</span>
      </div>

      <div className={styles.body}>
        {lines.map((line, idx) => (
          <div key={idx} className={`${styles.line} ${TYPE_CLASS[line.type]}`} dir="ltr">
            {line.type === 'command' && <span className={styles.prompt}>root@ccu-server:~$</span>}
            {line.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalBlock;