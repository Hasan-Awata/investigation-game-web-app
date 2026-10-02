import type { TerminalBlock, TerminalBlockType } from '@/types/evidence/terminal';
import type { ReactElement } from 'react';

import PromptLineBlock from './PromptLineBlock';
import OutputStreamBlock from './OutputStreamBlock';
import StatusBannerBlock from './StatusBannerBlock';
import EncryptionFlowBlock from './EncryptionFlowBlock';
import HashMatrixBlock from './HashMatrixBlock';
import FileTreeBlock from './FileTreeBlock';
import AsciiPanelBlock from './AsciiPanelBlock';
import PacketTraceBlock from './PacketTraceBlock';
import SpacerBlock from '@/components/blocks/SpacerBlock';

type TerminalBlockComponent = (props: { block: TerminalBlock; ctx: { evidenceId: number } }) => ReactElement | null;

// Wrapper for SpacerBlock to accept TerminalBlock
const SpacerBlockWrapper: TerminalBlockComponent = ({ block }) => {
  const spacerBlock = block as TerminalBlock & { type: 'spacer' };
  return <SpacerBlock block={spacerBlock} />;
};

export const TERMINAL_BLOCK_REGISTRY: Record<TerminalBlockType, TerminalBlockComponent> = {
  prompt_line: PromptLineBlock,
  output_stream: OutputStreamBlock,
  status_banner: StatusBannerBlock,
  encryption_flow: EncryptionFlowBlock,
  hash_matrix: HashMatrixBlock,
  file_tree: FileTreeBlock,
  ascii_panel: AsciiPanelBlock,
  packet_trace: PacketTraceBlock,
  spacer: SpacerBlockWrapper,
} as const;

export const getBlockComponent = (type: TerminalBlockType): TerminalBlockComponent => {
  const Comp = TERMINAL_BLOCK_REGISTRY[type];
  if (!Comp) {
    throw new Error(`Terminal block type "${type}" is not registered.`);
  }
  return Comp;
};

export const TERMINAL_BLOCK_TYPES: readonly TerminalBlockType[] = [
  'prompt_line',
  'output_stream',
  'status_banner',
  'encryption_flow',
  'hash_matrix',
  'file_tree',
  'ascii_panel',
  'packet_trace',
  'spacer',
] as const;