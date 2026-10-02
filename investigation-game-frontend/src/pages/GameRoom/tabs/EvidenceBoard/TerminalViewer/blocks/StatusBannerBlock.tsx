import type { TerminalBlock } from '@/types/evidence/terminal';
import { isTerminalBlock } from '@/types/evidence/terminal';
import './StatusBannerBlock.css';

export default function StatusBannerBlock({ block }: { block: TerminalBlock }) {
  if (!isTerminalBlock(block, 'status_banner')) return null;
  const { text, tone = 'info', caption } = block.props;

  return (
    <div className={`tb-status-banner tb-tone-${tone}`}>
      <div className="tb-status-banner__text">{text}</div>
      {caption && <div className="tb-status-banner__caption">{caption}</div>}
    </div>
  );
}