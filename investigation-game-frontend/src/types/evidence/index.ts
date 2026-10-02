import type { BaseEvidence } from './base';
import type { DocDocument } from './doc';
import type { TerminalDocument } from './terminal';

export * from './base';
export * from './doc';
export * from './terminal';

/**
 * The universal paper-artefact evidence type.
 *
 * `document` and `forensic` are no longer distinguishable in the data model:
 * both carry an opaque `metadata.doc` block envelope and are rendered by
 * `UniversalDocViewer`. Any differentiation is a property of the blocks
 * themselves (a ledger table, an electropherogram), not of the evidence row.
 *
 * There is no `sub_type`. See PlansEvidence.md section 4.
 */
export interface DocEvidence extends BaseEvidence {
  evidence_type: 'document' | 'forensic';
  metadata: { doc: DocDocument; [key: string]: unknown };
}

/**
 * Digital evidence - terminal surface.
 */
export interface DigitalEvidence extends BaseEvidence {
  evidence_type: 'digital';
  metadata: { terminal: TerminalDocument };
}

// 1. STRICT TESTIMONY TYPE
export interface TranscriptLine {
  type: 'q' | 'a';
  speaker: string;
  text: string;
}

export interface TestimonyMetadata {
  agency?: string;
  title?: string;
  date?: string;
  case_number?: string;
  subject_name?: string;
  interviewer?: string;
  context?: string;
  transcript?: TranscriptLine[] | string;
}

export interface TestimonyEvidence extends BaseEvidence {
  evidence_type: 'testimony';
  metadata: TestimonyMetadata;
}

// 2. STRICT MEDIA TYPE (For Audio & Images)
export interface MediaEvidence extends BaseEvidence {
  evidence_type: 'image' | 'audio';
  metadata?: Record<string, unknown> | null;
}

// 3. THE MASTER TYPE
export type Evidence = DocEvidence | DigitalEvidence | TestimonyEvidence | MediaEvidence;

/** True for the types that render through the block engine (paper surface). */
export const isDocEvidence = (e: Evidence): e is DocEvidence =>
  e.evidence_type === 'document' || e.evidence_type === 'forensic';

/** True for digital evidence (terminal surface). */
export const isDigitalEvidence = (e: Evidence): e is DigitalEvidence =>
  e.evidence_type === 'digital';

/**
 * Single authority for surface routing. Replaces the ad-hoc `isDocType()`/`isDocEvidenceType()`.
 */
export const surfaceOf = (t: string): 'paper' | 'terminal' | 'testimony' | 'media' => {
  switch (t) {
    case 'document':
    case 'forensic':
      return 'paper';
    case 'digital':
      return 'terminal';
    case 'testimony':
      return 'testimony';
    case 'image':
    case 'audio':
      return 'media';
    default:
      return 'paper';
  }
};