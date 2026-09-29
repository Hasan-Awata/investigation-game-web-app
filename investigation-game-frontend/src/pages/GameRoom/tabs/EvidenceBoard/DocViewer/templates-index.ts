import type { DocDocument } from '@/types/evidence/doc';
import { DOC_TEMPLATES, resetTemplateSeq } from './templates';

/** Build a DocDocument from a template key. */
export const buildTemplate = (key: string): DocDocument | undefined => {
  const template = DOC_TEMPLATES.find(t => t.key === key);
  return template?.build();
};

/** All available template keys. */
export type TemplateName = 'correspondence' | 'financial_record' | 'journal' | 'contract' | 'memo' | 'background_check' | 'phone_records' | 'autopsy' | 'ballistics' | 'dna' | 'digital_forensics' | 'trace_analysis';

/** Map of template builders for the admin palette. */
export const templates: Record<TemplateName, () => DocDocument> = {
  correspondence: () => buildTemplate('correspondence')!,
  financial_record: () => buildTemplate('financial_record')!,
  journal: () => buildTemplate('journal')!,
  contract: () => buildTemplate('contract')!,
  memo: () => buildTemplate('memo')!,
  background_check: () => buildTemplate('background_check')!,
  phone_records: () => buildTemplate('phone_records')!,
  autopsy: () => buildTemplate('autopsy')!,
  ballistics: () => buildTemplate('ballistics')!,
  dna: () => buildTemplate('dna')!,
  digital_forensics: () => buildTemplate('digital_forensics')!,
  trace_analysis: () => buildTemplate('trace_analysis')!,
};

export { resetTemplateSeq };