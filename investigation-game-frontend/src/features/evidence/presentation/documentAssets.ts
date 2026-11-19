import { assetUrl } from '@/utils/assetUrl';
import type { AssetGroup, Label } from '../model';
import manifest from './document-assets.generated.json';

type Asset = { path: string; label: Label; frame?: boolean };
const assets: Record<AssetGroup, Record<string, Asset>> = manifest;

export function documentAssetOptions(group: AssetGroup) {
  return Object.entries(assets[group]);
}

export function documentAsset(group: AssetGroup, id: string) {
  if (!Object.hasOwn(assets[group], id)) return;
  const { path, label, frame } = assets[group][id];
  return { url: assetUrl(path), label, frame };
}
