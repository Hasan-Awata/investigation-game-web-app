import { useRef, useState, type DragEvent } from 'react';
import { useAdminMutations } from '@/pages/Admin/hooks/useAdminMutations';
import { AdminCheckbox } from '@/pages/Admin/components/AdminUI';
import type { ValidationErrors } from '@/utils/Result';
import styles from './CaseBundleDropzone.module.css';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const formatBytes = (bytes: number): string => (
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`
);

/**
 * Drag-and-drop / file-pick importer for a `case-bundle.zip` (a `case.json`
 * plus a `media/` tree). On success the shared mutation invalidates the case
 * list, so the freshly imported case appears immediately.
 */
export default function CaseBundleDropzone() {
  const { importEntity, isProcessing } = useAdminMutations('case');
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<{ message: string; errors?: ValidationErrors } | null>(null);
  const [storeLocally, setStoreLocally] = useState(true);

  const validateAndSet = (candidate: File | undefined) => {
    if (isProcessing || !candidate) return;
    clear();

    if (!candidate.name.toLowerCase().endsWith('.zip')) {
      setError({ message: 'Only .zip case bundles are supported.' });
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setError({ message: `Bundle exceeds the ${MAX_SIZE_MB}MB upload limit.` });
      return;
    }

    setFile(candidate);
  };

  const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSet(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleImport = () => {
    if (!file || isProcessing) return;
    setError(null);
    importEntity({ file, storeLocally }, {
      onSuccess: () => setFile(current => current === file ? null : current),
      onError: setError,
    });
  };

  return (
    <div className={styles.wrapper}>
      <label
        className={`${styles.dropzone} ${isDragging ? styles.active : ''} ${error ? styles.error : ''}`.trim()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          disabled={isProcessing}
          className={styles.input}
          onChange={(e) => validateAndSet(e.target.files?.[0])}
        />
        <span className={styles.badge}>[ CASE BUNDLE ]</span>
        <span className={styles.title}>Import a case bundle</span>
        <span className={styles.hint}>Drag &amp; drop a .zip here, or click to browse</span>
        <span className={styles.meta}>case.json + media/ tree &middot; max {MAX_SIZE_MB}MB</span>
      </label>

      {error && (
        <div role="alert">
          <p className={styles.errorText}>{error.message}</p>
          {error.errors && (
            <ul className={styles.errorText}>
              {Object.entries(error.errors).flatMap(([path, messages]) => messages.map((message, index) => (
                <li key={`${path}-${index}`}><code>{path}</code>: {message}</li>
              )))}
            </ul>
          )}
        </div>
      )}

      {file && (
        <div className={styles.fileRow}>
          <div className={styles.fileMeta}>
            <strong>{file.name}</strong>
            <span>{formatBytes(file.size)}</span>
          </div>
          <button type="button" className={styles.removeBtn} onClick={clear} disabled={isProcessing}>
            Remove
          </button>
        </div>
      )}

      <AdminCheckbox
        checked={storeLocally}
        disabled={isProcessing}
        onChange={(e) => setStoreLocally(e.target.checked)}
        labelTitle="Store media locally"
        description="Keep bundle media on this server instead of Cloudinary"
      />

      <button
        type="button"
        className={styles.importBtn}
        onClick={handleImport}
        disabled={!file || isProcessing}
      >
        {isProcessing ? 'Importing bundle...' : 'Import bundle'}
      </button>
    </div>
  );
}
