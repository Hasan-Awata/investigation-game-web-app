import type {
  BlockBase,
  SpacerBlock,
} from './shared';
import { clampSpan, nextBlockId } from './shared';

/* ------------------------------------------------------------------ *
 * Themes
 * ------------------------------------------------------------------ */

export type TerminalTheme = 'terminal';

export const TERMINAL_THEMES: readonly TerminalTheme[] = ['terminal'] as const;

/* ------------------------------------------------------------------ *
 * Block props
 * ------------------------------------------------------------------ */

export interface PromptLineProps {
  prompt: string;
  command: string;
  output: string[];
  tone?: 'stdout' | 'stderr' | 'warn' | 'ok' | 'info';
}

export interface OutputStreamProps {
  lines: string[];
  tone?: 'stdout' | 'stderr' | 'warn' | 'ok' | 'info';
  label?: string;
}

export interface StatusBannerProps {
  text: string;
  tone: 'info' | 'ok' | 'warn' | 'critical';
  caption?: string;
}

export interface EncryptionFlowStep {
  label: string;
  detail?: string;
  token?: string;
}

export interface EncryptionFlowProps {
  steps: EncryptionFlowStep[];
  direction: 'h' | 'v';
  algorithm?: string;
}

export interface HashMatrixRow {
  offset: string;
  bytes: string[];
  ascii: string;
}

export interface HashMatrixProps {
  rows: HashMatrixRow[];
  algorithm: string;
}

export interface FileTreeEntry {
  path: string;
  size?: string;
  mtime?: string;
  kind: 'file' | 'dir' | 'symlink' | 'deleted';
  state?: 'recovered' | 'intact' | 'corrupted' | 'encrypted';
}

export interface FileTreeProps {
  entries: FileTreeEntry[];
  indent?: number;
}

export interface AsciiPanelProps {
  lines: string[];
  caption?: string;
  frame: 'box' | 'heavy' | 'none';
}

export interface PacketTraceRow {
  src: string;
  dst: string;
  proto: string;
  bytes: string;
  state: string;
}

export interface PacketTraceProps {
  rows: PacketTraceRow[];
}

/* ------------------------------------------------------------------ *
 * The block union
 * ------------------------------------------------------------------ */

export type TerminalOnlyBlock =
  | (BlockBase & { type: 'prompt_line'; props: PromptLineProps })
  | (BlockBase & { type: 'output_stream'; props: OutputStreamProps })
  | (BlockBase & { type: 'status_banner'; props: StatusBannerProps })
  | (BlockBase & { type: 'file_tree'; props: FileTreeProps });

export type TerminalBlock = TerminalOnlyBlock | SpacerBlock;

export type TerminalBlockType = TerminalBlock['type'];

export const TERMINAL_BLOCK_TYPES: readonly TerminalBlockType[] = [
  'prompt_line',
  'output_stream',
  'status_banner',
  'file_tree',
  'spacer',
] as const;

export const TERMINAL_OVERLAY_BLOCK_TYPES: readonly TerminalBlockType[] = [] as const;

/* ------------------------------------------------------------------ *
 * The document envelope
 * ------------------------------------------------------------------ */

export interface TerminalDocument {
  v: 1;
  theme: TerminalTheme;
  blocks: TerminalBlock[];
}

/** Stored under `metadata.terminal`. */
export interface TerminalMetadata {
  terminal?: TerminalDocument;
}

export const DEFAULT_TERMINAL: TerminalDocument = {
  v: 1,
  theme: 'terminal',
  blocks: [],
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export const clampTerminalSpan = clampSpan;
export const nextTerminalBlockId = nextBlockId;

export const normalizeTerminal = (metadata: unknown): TerminalDocument => {
  const raw = (metadata as TerminalMetadata | null | undefined)?.terminal;
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TERMINAL, blocks: [] };
  }

  const theme: TerminalTheme = TERMINAL_THEMES.includes(raw.theme) ? raw.theme : 'terminal';

  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks
        .filter((b: unknown): b is TerminalBlock => {
          if (!b || typeof b !== 'object' || !('type' in b)) return false;
          const block = b as Record<string, unknown>;
          if (!('props' in block) || block.props === null || typeof block.props !== 'object') return false;
          return TERMINAL_BLOCK_TYPES.includes(block.type as TerminalBlockType);
        })
    : [];

  return { v: 1, theme, blocks };
};

export const ensureTerminalBlockIds = (blocks: TerminalBlock[]): TerminalBlock[] =>
  blocks.map((b) => {
    const withId = b.id ? b : ({ ...b, id: nextBlockId() } as TerminalBlock);
    return withId;
  });

/* ------------------------------------------------------------------ *
 * Type guards for discriminated unions
 * ------------------------------------------------------------------ */

export const isTerminalBlock = <T extends TerminalBlockType>(
  block: TerminalBlock,
  type: T
): block is Extract<TerminalBlock, { type: T }> => block.type === type;

export const isTerminalBlockType = (block: TerminalBlock, type: TerminalBlockType): boolean =>
  block.type === type;

export function assertTerminalBlock<T extends TerminalBlockType>(
  block: TerminalBlock,
  type: T
): asserts block is Extract<TerminalBlock, { type: T }> {
  if (block.type !== type) {
    throw new Error(`Expected block type "${type}", got "${block.type}"`);
  }
}

export function getTerminalBlockProps(
  block: TerminalBlock,
  type: TerminalBlockType
): TerminalBlock['props'] | null {
  if (block.type !== type) return null;
  return block.props;
}