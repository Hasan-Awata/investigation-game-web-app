export type BlockAlign = 'start' | 'center' | 'end';

export interface BlockStyle {
  align?: BlockAlign;
  tone?: string;
  pad?: number;
}

export interface BlockBase {
  id: string;
  span?: number;
  style?: BlockStyle;
}

export interface BlockRenderContext {
  evidenceId: number;
}

export interface SpacerProps {
  height: number;
}

export type SpacerBlock = BlockBase & { type: 'spacer'; props: SpacerProps };

let blockSeq = 0;
export const nextBlockId = (prefix = 'b'): string => {
  blockSeq += 1;
  return `${prefix}_${blockSeq.toString(36)}_${Date.now().toString(36).slice(-4)}`;
};

export const clampSpan = (span?: number): number => {
  const n = Number(span);
  if (!Number.isFinite(n)) return 12;
  return Math.min(12, Math.max(1, Math.round(n)));
};

export const blockSeqFn = () => blockSeq;