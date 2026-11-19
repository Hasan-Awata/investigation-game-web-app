import type { Template } from '@/features/evidence/model';

interface BaseEvidence {
  id: number;
  case_id: number;
  title: string;
  description?: string | null;
  img_url?: string | null;
  audio_url?: string | null;
  is_initial: boolean;
  is_vital_for_conviction: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * The universal paper-artefact evidence type.
 *
 * Both paper evidence types use versioned templates.
 */
export interface DocEvidence extends BaseEvidence {
  evidence_type: 'document' | 'forensic';
  metadata: { template: Template; [key: string]: unknown };
}

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

export interface MediaEvidence extends BaseEvidence {
  evidence_type: 'image' | 'audio';
  metadata?: Record<string, unknown> | null;
}

export type Evidence = DocEvidence | TestimonyEvidence | MediaEvidence;
