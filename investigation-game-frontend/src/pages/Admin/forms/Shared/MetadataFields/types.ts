export interface MetadataFieldProps<T> {
  metadata: Partial<T>;
  updateMeta: <K extends keyof T>(key: K, value: T[K]) => void;
}