import type { BaseEvidence } from './base';
import type { ForensicEvidence } from './forensic';
import type { DocumentEvidence } from './document';

export * from './base';
export * from './forensic';
export * from './document';

// Legacy/Basic media types that don't utilize complex JSON metadata yet
export type MediaEvidence = BaseEvidence & {
  evidence_type: 'image' | 'audio' | 'testimony';
  sub_type?: string | null;
  metadata?: any | null; 
};

// The Master Type
export type Evidence = ForensicEvidence | DocumentEvidence | MediaEvidence;