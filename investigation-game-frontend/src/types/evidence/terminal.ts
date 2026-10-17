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

/* ------------------------------------------------------------------ *
 * The block union
 * ------------------------------------------------------------------ */

export type TerminalOnlyBlock =
  | (BlockBase & { type: 'prompt_line'; props: PromptLineProps })
  | (BlockBase & { type: 'output_stream'; props: OutputStreamProps })
  | (BlockBase & { type: 'status_banner'; props: StatusBannerProps })
  | (BlockBase & { type: 'file_tree'; props: FileTreeProps });

export interface UnsupportedTerminalBlock extends BlockBase {
  type: 'unsupported';
  props: { originalType: string };
}

export type TerminalBlock = TerminalOnlyBlock | SpacerBlock | UnsupportedTerminalBlock;

export type TerminalBlockType = Exclude<TerminalBlock['type'], 'unsupported'>;

export const TERMINAL_BLOCK_TYPES: readonly TerminalBlockType[] = [
  'prompt_line',
  'output_stream',
  'status_banner',
  'file_tree',
  'spacer',
] as const;

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
    ? raw.blocks.flatMap((value: unknown): TerminalBlock[] => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
        const block = value as Record<string, unknown>;
        if (typeof block.type !== 'string') return [];
        if (
          TERMINAL_BLOCK_TYPES.includes(block.type as TerminalBlockType) &&
          !!block.props && typeof block.props === 'object' && !Array.isArray(block.props)
        ) {
          return [block as unknown as TerminalBlock];
        }

        return [{
          ...block,
          type: 'unsupported',
          props: { originalType: block.type },
        } as unknown as UnsupportedTerminalBlock];
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
