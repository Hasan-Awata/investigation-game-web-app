import { assetUrl } from '@/utils/assetUrl';

/**
 * Procedural signature assets.
 *
 * There is no signature picker in this project. The legacy viewers derived a
 * deterministic signature image from the evidence row id
 * (ForensicViewers/BallisticsViewer.tsx:19-23, DocumentViewers/ContractViewer.tsx:26-40).
 * This module preserves that behaviour, generalised to any column count.
 *
 * The 19 SVGs live in the Laravel backend at `public/assets/signatures/`
 * (`signature.svg` plus `signature-1.svg` .. `signature-18.svg`), which is a
 * different origin from the Vite dev server -- hence `assetUrl`.
 */

/**
 * Must be 19, not 18: there are 19 files, and `index % RANGE` can only ever
 * produce `0 .. RANGE - 1`. A range of 18 would make `signature-18.svg`
 * permanently unreachable.
 */
const SIGNATURE_RANGE = 19;

const fileName = (index: number) => (index === 0 ? 'signature.svg' : `signature-${index}.svg`);

export const signatureUrl = (index: number): string =>
  assetUrl(`/assets/signatures/${fileName(index)}`);

/**
 * Picks `count` distinct signature indices, stable for a given evidence id.
 * Collisions are walked forward rather than resolved randomly, so the same
 * evidence always yields the same faces on the same document.
 */
export const signatureIndices = (evidenceId: number, count: number): number[] => {
  const wanted = Math.max(0, Math.floor(count));
  if (wanted === 0) return [];

  const picked: number[] = [];
  let probe = 0;
  const limit = SIGNATURE_RANGE * 4;

  while (picked.length < wanted && probe < limit) {
    const index = (evidenceId + probe) % SIGNATURE_RANGE;
    if (!picked.includes(index)) picked.push(index);
    probe += 1;
  }

  return picked;
};
