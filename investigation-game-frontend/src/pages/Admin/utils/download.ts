export const slugifyFilename = (value: string, fallback = 'case'): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Defer revocation so the browser has time to start the download; revoking
  // the object URL synchronously can cancel it in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
