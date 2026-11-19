/**
 * Resolves backend-served static asset paths to absolute URLs.
 *
 * Case images and testimony signatures are served by the Laravel app out
 * of `public/assets/`, but the frontend runs on a different origin in dev
 * (Vite on :5173, API on :8000). A relative path like `/assets/x.png` inside
 * template fields would otherwise resolve against the Vite origin. The model's
 * URL accessor applies to the `img_url` column only.
 *
 * Absolute URLs and data URIs are passed through untouched, so a document may
 * legitimately point at a CDN.
 */

import { ENV } from '@/config/env';

/** Resolved backend origin, e.g. `http://localhost:8000`. */
const assetOrigin = (): string => ENV.API_BASE_URL;

const FALLBACK_ORIGIN = 'http://localhost:8000';

export const assetUrl = (path: string): string => {
  const trimmed = (path ?? '').trim();
  if (!trimmed) return '';

  // Already absolute, protocol-relative, or inline data.
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed;

  return `${assetOrigin() || FALLBACK_ORIGIN}/${trimmed.replace(/^\/+/, '')}`;
};
