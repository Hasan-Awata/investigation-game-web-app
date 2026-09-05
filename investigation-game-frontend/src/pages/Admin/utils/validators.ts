export const validateCaseForm = (data: { max_strikes: string | number; rating_stars: string | number }) => {
  if (Number(data.max_strikes) < 1) return 'Cases must allow at least 1 strike.';
  if (Number(data.rating_stars) > 5 || Number(data.rating_stars) < 0) return 'Rating must be between 0 and 5.0';
  return null;
};

export const validatePhaseForm = (data: { order_index: string | number; map_url?: string; coord_x?: string | number; coord_y?: string | number }) => {
  if (Number(data.order_index) < 1) return 'Order index must be at least 1.';
  
  if (data.map_url && (!data.coord_x || !data.coord_y)) {
    return 'Coordinates must be mapped when a map is selected.';
  }
  
  return null;
};

export const validateInvestigationRequestForm = (data: { required_evidence_ids: string[]; unlocks_evidence_id: string; unlocks_level_id: string }, minEvidenceAlert: string, rewardAlert: string) => {
  if (data.required_evidence_ids.length < 2) return minEvidenceAlert;
  if (!data.unlocks_evidence_id && !data.unlocks_level_id) return rewardAlert;
  return null;
};

export const validateLevelForm = (data: { order_index: string | number }) => {
  if (Number(data.order_index) < 1) return 'Order index must be at least 1.';
  return null;
};

export const validateEvidenceForm = (data: { evidence_type: string; sub_type: string }) => {
  if ((data.evidence_type === 'document' || data.evidence_type === 'forensic') && !data.sub_type) {
    return 'You must select a specific classification sub-type for this evidence.';
  }
  return null;
};

export const validateSuspectForm = (data: { name: string }) => {
  if (!data.name.trim()) return 'Suspect name cannot be empty.';
  return null;
};

export const validateVictimForm = (data: { name: string }) => {
  if (!data.name.trim()) return 'Victim name cannot be empty.';
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