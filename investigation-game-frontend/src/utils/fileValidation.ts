export const validateImageSize = (file: File | undefined): boolean => {
  if (!file) return false;
  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    alert(`SECURITY WARNING: File size exceeds the 4MB limit (Current size: ${sizeInMB}MB). Please compress the image before uploading to prevent UI freezing and HTTP 413 errors.`);
    return false;
  }
  return true;
};

export const validateAudioSize = (file: File | undefined): boolean => {
  if (!file) return false;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    alert(`SECURITY WARNING: File size exceeds the 10MB limit (Current size: ${sizeInMB}MB). Please compress the audio before uploading to prevent UI freezing and HTTP 413 errors.`);
    return false;
  }
  return true;
};