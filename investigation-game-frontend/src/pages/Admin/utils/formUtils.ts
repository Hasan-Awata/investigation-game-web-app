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