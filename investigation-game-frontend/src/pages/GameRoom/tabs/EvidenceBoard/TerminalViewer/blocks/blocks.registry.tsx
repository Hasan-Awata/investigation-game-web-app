import type { TerminalBlock, TerminalBlockType } from '@/types/evidence/terminal';
import type { ReactElement } from 'react';

import PromptLineBlock from './PromptLineBlock';
import OutputStreamBlock from './OutputStreamBlock';
import StatusBannerBlock from './StatusBannerBlock';
import FileTreeBlock from './FileTreeBlock';
import { SpacerBlock } from './index';

type TerminalBlockComponent = (props: { block: TerminalBlock; ctx: { evidenceId: number } }) => ReactElement | null;

export const TERMINAL_BLOCK_REGISTRY: Record<TerminalBlockType, TerminalBlockComponent> = {
  prompt_line: PromptLineBlock,
  output_stream: OutputStreamBlock,
  status_banner: StatusBannerBlock,
  file_tree: FileTreeBlock,
  spacer: SpacerBlock,
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
  'file_tree',
  'spacer',
] as const;