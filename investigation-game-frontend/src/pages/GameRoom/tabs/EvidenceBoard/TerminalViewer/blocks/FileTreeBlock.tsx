import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './FileTreeBlock.css';

const KIND_GLYPHS: Record<string, string> = {
  dir: '📁',
  file: '📄',
  symlink: '🔗',
  deleted: '🗑️',
};

const STATE_GLYPHS: Record<string, string> = {
  recovered: '⟳',
  intact: '✓',
  corrupted: '✗',
  encrypted: '🔒',
};

export default function FileTreeBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'file_tree')) return null;
  const { entries, indent = 2 } = block.props;

  return (
    <div className="tb-file-tree">
      <pre className="tb-file-tree__pre">
        {entries.map((entry, i) => (
          <div key={i} className="tb-file-tree__line" style={{ paddingLeft: `${entry.path.split('/').length * indent}ch` }}>
            <span className="tb-file-tree__glyph">{KIND_GLYPHS[entry.kind] ?? '?'}</span>
            <span className="tb-file-tree__path">{entry.path}</span>
            {entry.size && <span className="tb-file-tree__size">{entry.size}</span>}
            {entry.mtime && <span className="tb-file-tree__mtime">{entry.mtime}</span>}
            {entry.state && <span className={`tb-file-tree__state tb-file-tree__state--${entry.state}`}>{STATE_GLYPHS[entry.state] ?? ''}</span>}
          </div>
        ))}
      </pre>
    </div>
  );
}