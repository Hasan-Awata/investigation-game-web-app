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

export const validateInvestigationRequestForm = (data: { required_evidence_ids: string[]; required_character_ids?: string[]; unlocks_evidence_id: string; unlocks_level_id: string }, minItemsAlert: string, rewardAlert: string) => {
  if (data.required_evidence_ids.length + (data.required_character_ids?.length || 0) < 2) return minItemsAlert;
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

const hasBlocks = (v: unknown): boolean => {
  if (!v || typeof v !== 'object') return false;
  const blocks = (v as { blocks?: unknown }).blocks;
  return Array.isArray(blocks) && blocks.length > 0;
};

/**
 * `document` / `forensic` must carry a non-empty `metadata.doc.blocks` array,
 * since the viewer renders an empty sheet as "contents illegible" -- saving one
 * would produce an evidence row that is silently broken in game.
 * 
 * `digital` must carry a non-empty `metadata.terminal.blocks` array.
 */
export const validateEvidenceForm = (data: { evidence_type: string; metadata?: Record<string, unknown> }) => {
  if (isDocEvidenceType(data.evidence_type)) {
    const doc = data.metadata?.doc;
    if (!doc || !hasBlocks(doc)) {
      return 'Add at least one block to the document. An empty document renders as illegible.';
    }
    return null;
  }

  if (isDigitalEvidenceType(data.evidence_type)) {
    const terminal = data.metadata?.terminal;
    if (!terminal || !hasBlocks(terminal)) {
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
