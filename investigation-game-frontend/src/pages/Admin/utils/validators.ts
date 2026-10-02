export const validateCaseForm = (data: { max_strikes: string | number; rating_stars: string | number }) => {
  if (Number(data.max_strikes) < 1) return 'Cases must allow at least 1 strike.';
  if (Number(data.rating_stars) > 5 || Number(data.rating_stars) < 0) return 'Rating must be between 0 and 5.0';
  return null;
};

export const validateZoneForm = (data: { order_index: string | number; coord_x?: string | number; coord_y?: string | number }) => {
  if (Number(data.order_index) < 1) return 'Order index must be at least 1.';
  
  if ((data.coord_x && !data.coord_y) || (!data.coord_x && data.coord_y)) {
    return 'Both X and Y coordinates must be provided to set a map location.';
  }
  
  return null;
};

export const validateInvestigationRequestForm = (data: { required_evidence_ids: string[]; unlocks_evidence_id: string; unlocks_level_id: string }, minEvidenceAlert: string, rewardAlert: string) => {
  if (data.required_evidence_ids.length < 2) return minEvidenceAlert;
  if (!data.unlocks_evidence_id && !data.unlocks_level_id) return rewardAlert;
  return null;
};

export const validateLevelForm = (data: { order_index: string | number; zone_id?: string | number }) => {
  if (!data.zone_id) return 'You must assign this lead to a specific Zone.';
  if (Number(data.order_index) < 1) return 'Order index must be at least 1.';
  return null;
};

const isDocEvidenceType = (t: string): boolean => t === 'document' || t === 'forensic';
const isDigitalEvidenceType = (t: string): boolean => t === 'digital';

/**
 * `document` / `forensic` must carry a non-empty `metadata.doc.blocks` array,
 * since the viewer renders an empty sheet as "contents illegible" -- saving one
 * would produce an evidence row that is silently broken in game.
 * 
 * `digital` must carry a non-empty `metadata.terminal.blocks` array.
 */
export const validateEvidenceForm = (data: { evidence_type: string; metadata?: Record<string, any> }) => {
  if (isDocEvidenceType(data.evidence_type)) {
    const doc = data.metadata?.doc;
    if (!doc || typeof doc !== 'object') {
      return 'This evidence needs a document. Compose it in the builder before saving.';
    }
    if (!Array.isArray(doc.blocks) || doc.blocks.length === 0) {
      return 'Add at least one block to the document. An empty document renders as illegible.';
    }
    return null;
  }

  if (isDigitalEvidenceType(data.evidence_type)) {
    const terminal = data.metadata?.terminal;
    if (!terminal || typeof terminal !== 'object') {
      return 'This evidence needs a terminal session. Compose it in the builder before saving.';
    }
    if (!Array.isArray(terminal.blocks) || terminal.blocks.length === 0) {
      return 'Add at least one block to the terminal session. An empty session renders as empty.';
    }
    return null;
  }

  return null;
};

export const validateCharacterForm = (data: { name: string }) => {
  if (!data.name.trim()) return 'Character name cannot be empty.';
  return null;
};

export const validateImageSize = (file: File | undefined, maxSizeMB: number = 4): string | null => {
  if (!file) return null;
  const MAX_FILE_SIZE = maxSizeMB * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return `SECURITY WARNING: File size exceeds the ${maxSizeMB}MB limit (Current size: ${sizeInMB}MB). Please compress the image before uploading to prevent UI freezing and HTTP 413 errors.`;
  }
  return null;
};

export const validateAudioSize = (file: File | undefined): string | null => {
  if (!file) return null;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return `SECURITY WARNING: File size exceeds the 10MB limit (Current size: ${sizeInMB}MB). Please compress the audio before uploading to prevent UI freezing and HTTP 413 errors.`;
  }
  return null;
};

export const validateJsonPayload = (jsonString: string, requiredFields: string[] = []): { valid: boolean; parsed?: any; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);

    // Guard clause: ensure it's a strict object, not an array, primitive, or null
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { valid: false, error: 'Invalid payload: JSON must be a standard object.' };
    }

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    return { valid: true, parsed };
  } catch (e: any) {
    return { valid: false, error: `Invalid JSON format: ${e.message}` };
  }
};