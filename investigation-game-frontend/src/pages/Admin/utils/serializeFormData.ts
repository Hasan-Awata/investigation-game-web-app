/**
 * The single FormData encoder for admin payloads. Every form on the admin
 * surface serializes through here — there are no competing encoders.
 *
 * Wire conventions (must match the backend FormRequest rules):
 * - booleans travel as `'1'`/`'0'` (Laravel `boolean` rule / `$request->boolean()`)
 * - arrays travel as indexed bracket entries: `key[0]`, `key[1]`
 *   (Laravel `array` + `key.*` rules) — the one array convention
 * - nested objects travel as bracket paths: `key[sub][deeper]`
 * - `null`/`undefined` are omitted (Laravel `nullable`)
 * - `File`/`Blob` values are appended verbatim
 * - everything else is appended as `String(value)`
 *
 * `metadata` is the sole exception and travels as one raw JSON string:
 * multipart fields are always strings, so bracket-encoding the evidence
 * doc/terminal tree would turn nested booleans (`ordered: false`) into the
 * truthy string `'0'` and corrupt every list/letterhead flag on read-back.
 * The backend accepts both shapes (`EvidenceMetadataMatchesType` +
 * `AdminEvidenceController::normalizeMetadata`).
 */

export type FormValue =
  | string
  | number
  | boolean
  | File
  | Blob
  | null
  | undefined
  | FormValue[]
  | { [key: string]: FormValue };

const RAW_JSON_KEYS = new Set(['metadata']);

const appendValue = (formData: FormData, key: string, value: unknown): void => {
  if (value === null || value === undefined) return;

  if (typeof value === 'boolean') {
    formData.append(key, value ? '1' : '0');
  } else if (value instanceof Blob) {
    formData.append(key, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => appendValue(formData, `${key}[${index}]`, item));
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => appendValue(formData, `${key}[${childKey}]`, childValue));
  } else {
    formData.append(key, String(value));
  }
};

export const serializeFormData = (payload: Record<string, unknown>): FormData => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue;

    if (
      RAW_JSON_KEYS.has(key) &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Blob)
    ) {
      const json = JSON.stringify(value);
      if (json !== undefined) formData.append(key, json);
      continue;
    }

    appendValue(formData, key, value);
  }

  return formData;
};
