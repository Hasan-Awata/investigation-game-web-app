export const objectToFormData = (obj: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    
    if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
    } else if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value.toString());
    }
  });
  return formData;
};

import { DEFAULT_PAGE, DEFAULT_DOC } from '@/types/evidence/doc';

/**
 * Builds the `metadata` skeleton for a new evidence row.
 *
 * `document` and `forensic` both collapse to the universal block envelope, so
 * both get an empty `doc` and no `sub_type`. The old flat templates keyed by
 * sub-type are gone with the legacy viewers -- there is nothing left that could
 * read them, and keeping them would imply the classifications still exist.
 */
export const getEvidenceMetadataTemplate = (evidenceType: string): Record<string, any> => {
  if (evidenceType === 'testimony') {
    return {
      agency: "",
      title: "",
      date: "",
      case_number: "",
      subject_name: "",
      interviewer: "",
      context: "",
      transcript: ""
    };
  }

  if (evidenceType === 'image' || evidenceType === 'audio') {
    return {};
  }

  if (evidenceType === 'document' || evidenceType === 'forensic') {
    return {
      doc: { ...DEFAULT_DOC, page: { ...DEFAULT_PAGE }, blocks: [] },
    };
  }

  return {};
};