import { assetUrl } from '@/utils/assetUrl';
import type { AssetGroup, Label, Locale } from '../model';
import manifest from './document-assets.generated.json';

type Asset = { path: string | Record<Locale, string>; label: Label; frame?: boolean };
const assets: Record<AssetGroup, Record<string, Asset>> = manifest;

type AgencySeal = 'communications' | 'defense' | 'finance' | 'intelligence' | 'interior' | 'justice'
  | 'anti-narcotics-unit' | 'border-maritime-ports-authority' | 'counter-terrorism-forces'
  | 'cyber-crime-unit' | 'internal-security-service' | 'special-operations-administration';

export function agencySeal(name: AgencySeal) {
  return assetUrl(`/assets/documents/agency-seals/${name}.svg`);
}

export function documentAssetOptions(group: AssetGroup) {
  return Object.entries(assets[group]);
}

export function documentAsset(group: AssetGroup, id: string, locale: Locale = 'en') {
  if (!Object.hasOwn(assets[group], id)) return;
  const { path, label, frame } = assets[group][id];
  return { url: assetUrl(typeof path === 'string' ? path : path[locale]), label, frame };
}

const savedStampReplacements = new Map([['filed', 'under_investigation'], ['reviewed', 'officially_certified']]);

export function documentStamp(id: string, locale: Locale) {
  return documentAsset('stamp', savedStampReplacements.get(id) ?? id, locale);
}
