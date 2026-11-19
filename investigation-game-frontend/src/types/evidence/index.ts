import type { BaseEvidence } from './base';
import type { DocDocument } from './doc';

export * from './base';
export * from './doc';

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
  subject?: string;
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
export type Evidence = DocEvidence | TestimonyEvidence | MediaEvidence;

/** True for document / forensic evidence (paper surface). */
export const isDocEvidence = (e: Evidence): e is DocEvidence =>
  (e.evidence_type === 'document' || e.evidence_type === 'forensic') && hasDocument(e.metadata);

const hasDocument = (metadata: unknown): boolean => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || !('doc' in metadata)) return false;
  const doc = metadata.doc;
  return !!doc && typeof doc === 'object' && !Array.isArray(doc);
};

/**
 * Single authority for surface routing. Replaces the ad-hoc `isDocType()`/`isDocEvidenceType()`.
 */
export const surfaceOf = (t: string): 'paper' | 'testimony' | 'media' => {
  switch (t) {
    case 'document':
    case 'forensic':
      return 'paper';
    case 'testimony':
      return 'testimony';
    case 'image':
    case 'audio':
      return 'media';
    default:
      return 'paper';
  }
};
