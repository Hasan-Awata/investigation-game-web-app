import type { BaseEvidence } from './base';
import type { ForensicEvidence } from './forensic';
import type { DocumentEvidence } from './document';

export * from './base';
export * from './forensic';
export * from './document';

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
  sub_type?: null;
  metadata: TestimonyMetadata;
}

// 2. STRICT MEDIA TYPE (For Audio & Images)
export interface MediaEvidence extends BaseEvidence {
  evidence_type: 'image' | 'audio';
  sub_type?: null;
  metadata?: Record<string, unknown> | null; 
}

// 3. THE MASTER TYPE
export type Evidence = ForensicEvidence | DocumentEvidence | TestimonyEvidence | MediaEvidence;