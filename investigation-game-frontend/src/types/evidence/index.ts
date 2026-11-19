import type { BaseEvidence } from './base';
import type { Template } from '@/features/evidence/model';

export * from './base';

/**
 * The universal paper-artefact evidence type.
 *
 * Both paper evidence types use versioned templates.
 */
export interface DocEvidence extends BaseEvidence {
  evidence_type: 'document' | 'forensic';
  metadata: { template: Template; [key: string]: unknown };
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
