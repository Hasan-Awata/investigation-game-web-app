export const validateCaseForm = (data: { rating_stars: string | number }) => {
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
