/**
 * Resolves backend-served static asset paths to absolute URLs.
 *
 * Block images and procedural signature faces are served by the Laravel app out
 * of `public/assets/`, but the frontend runs on a different origin in dev
 * (Vite on :5173, API on :8000). A relative path like `/assets/x.png` inside
 * `metadata.doc` would therefore resolve against the Vite origin and 404, and
 * `Evidence::imgUrl()`'s `config('app.url')` prefixing does not apply to the doc
 * envelope -- that accessor is bound to the `img_url` column only.
 *
 * Absolute URLs and data URIs are passed through untouched, so a document may
 * legitimately point at a CDN.
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');

/** `http://localhost:8000/api` -> `http://localhost:8000`. */
const assetOrigin = (): string => (API_URL ?? '').replace(/\/api$/, '');

const FALLBACK_ORIGIN = 'http://localhost:8000';

export const assetUrl = (path: string): string => {
  const trimmed = (path ?? '').trim();
  if (!trimmed) return '';

  // Already absolute, protocol-relative, or inline data.
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed;

  return `${assetOrigin() || FALLBACK_ORIGIN}/${trimmed.replace(/^\/+/, '')}`;
};
