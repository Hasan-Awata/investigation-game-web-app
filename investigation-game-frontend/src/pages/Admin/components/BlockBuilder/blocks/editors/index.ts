import type { FC } from 'react';
import type { TerminalBlock } from '@/types/evidence/terminal';

import PromptLineEditor from './PromptLineEditor';
import OutputStreamEditor from './OutputStreamEditor';
import StatusBannerEditor from './StatusBannerEditor';
import FileTreeEditor from './FileTreeEditor';
import SpacerEditor from './SpacerEditor';

export const TERMINAL_EDITORS: Record<Exclude<TerminalBlock['type'], 'unsupported'>, FC<{ block: TerminalBlock; onUpdate: (updates: Partial<TerminalBlock>) => void; evidenceId: number }>> = {
  prompt_line: PromptLineEditor,
  output_stream: OutputStreamEditor,
  status_banner: StatusBannerEditor,
  file_tree: FileTreeEditor,
  spacer: SpacerEditor as FC<{ block: TerminalBlock; onUpdate: (updates: Partial<TerminalBlock>) => void; evidenceId: number }>,
};
