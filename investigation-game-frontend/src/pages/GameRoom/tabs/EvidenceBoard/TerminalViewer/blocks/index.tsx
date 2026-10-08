import type { TerminalBlock } from '@/types/evidence/terminal';
import type { ReactElement } from 'react';

import PromptLineBlock from './PromptLineBlock';
import OutputStreamBlock from './OutputStreamBlock';
import StatusBannerBlock from './StatusBannerBlock';
import FileTreeBlock from './FileTreeBlock';
import SpacerBlock from '@/components/blocks/SpacerBlock';

export { PromptLineBlock, OutputStreamBlock, StatusBannerBlock, FileTreeBlock };

const SpacerBlockWrapper: (props: { block: TerminalBlock; ctx: { evidenceId: number } }) => ReactElement | null = ({ block }) => {
  const spacerBlock = block as TerminalBlock & { type: 'spacer' };
  return <SpacerBlock block={spacerBlock} />;
};

export { SpacerBlockWrapper as SpacerBlock };