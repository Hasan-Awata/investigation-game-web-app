import { assetUrl } from '@/utils/assetUrl';

export const signatureUrl = (index: number): string =>
  assetUrl(`/assets/signatures/${index === 0 ? 'signature.svg' : `signature-${index}.svg`}`);
