import type { FC } from 'react';
import type { TerminalBlock } from '@/types/evidence/terminal';

import PromptLineEditor from './PromptLineEditor';
import OutputStreamEditor from './OutputStreamEditor';
import StatusBannerEditor from './StatusBannerEditor';
import EncryptionFlowEditor from './EncryptionFlowEditor';
import HashMatrixEditor from './HashMatrixEditor';
import FileTreeEditor from './FileTreeEditor';
import AsciiPanelEditor from './AsciiPanelEditor';
import PacketTraceEditor from './PacketTraceEditor';
import SpacerEditor from './SpacerEditor';

export const TERMINAL_EDITORS: Record<TerminalBlock['type'], FC<{ block: TerminalBlock; onUpdate: (updates: Partial<TerminalBlock>) => void; evidenceId: number }>> = {
  prompt_line: PromptLineEditor,
  output_stream: OutputStreamEditor,
  status_banner: StatusBannerEditor,
  encryption_flow: EncryptionFlowEditor,
  hash_matrix: HashMatrixEditor,
  file_tree: FileTreeEditor,
  ascii_panel: AsciiPanelEditor,
  packet_trace: PacketTraceEditor,
  spacer: SpacerEditor as FC<{ block: TerminalBlock; onUpdate: (updates: Partial<TerminalBlock>) => void; evidenceId: number }>,
};