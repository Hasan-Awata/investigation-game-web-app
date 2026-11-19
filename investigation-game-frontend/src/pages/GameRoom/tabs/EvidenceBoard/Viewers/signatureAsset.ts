import { documentAsset } from '@/features/evidence/presentation/documentAssets';

export const signatureUrl = (index: number): string | undefined =>
  documentAsset('signature', `signature_${String(index + 1).padStart(2, '0')}`)?.url;
