import type { TerminalBlock, TerminalBlockType, TerminalDocument, TerminalTheme } from '@/types/evidence/terminal';
import { nextTerminalBlockId, DEFAULT_TERMINAL } from '@/types/evidence/terminal';
import { templates } from '@/pages/GameRoom/tabs/EvidenceBoard/TerminalViewer/templates-index';

const DEFAULT_SPANS: Record<TerminalBlockType, number> = {
  prompt_line: 12,
  output_stream: 12,
  status_banner: 12,
  encryption_flow: 12,
  hash_matrix: 12,
  file_tree: 12,
  ascii_panel: 12,
  packet_trace: 12,
  spacer: 12,
};

const EMPTY_BLOCK_PROPS: Record<TerminalBlockType, TerminalBlock['props']> = {
  prompt_line: { prompt: '$', command: '', output: [], tone: 'stdout' },
  output_stream: { lines: [], tone: 'stdout', label: '' },
  status_banner: { text: '', tone: 'info', caption: '' },
  encryption_flow: { steps: [], direction: 'v', algorithm: '' },
  hash_matrix: { rows: [], algorithm: '' },
  file_tree: { entries: [], indent: 2 },
  ascii_panel: { lines: [], caption: '', frame: 'box' },
  packet_trace: { rows: [] },
  spacer: { height: 24 },
};

export function createTerminalBlock(type: TerminalBlockType): TerminalBlock {
  const base = { id: nextTerminalBlockId(type.slice(0, 3)), span: DEFAULT_SPANS[type], style: {} };
  const props = { ...EMPTY_BLOCK_PROPS[type] };
  return { ...base, type, props } as TerminalBlock;
}

export function cloneTerminalBlock(block: TerminalBlock): TerminalBlock {
  const cloned = structuredClone(block);
  cloned.id = nextTerminalBlockId(block.type.slice(0, 3));
  return cloned;
}

export function resolveTerminalTemplate(name: string): { blocks: TerminalBlock[]; theme?: TerminalTheme } | null {
  const templateFn = templates[name as keyof typeof templates];
  if (!templateFn) return null;
  const doc = templateFn();
  return { blocks: doc.blocks, theme: doc.theme };
}

export function emptyTerminalDoc(): TerminalDocument {
  return { ...DEFAULT_TERMINAL, blocks: [] };
}