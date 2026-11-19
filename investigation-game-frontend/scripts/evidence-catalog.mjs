import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
export const definitionsRoot = join(frontend, 'src/features/evidence/presentation/templates');
export const documentAssetsRoot = resolve(frontend, '../investigation-game-backend/public/assets/documents');
const output = resolve(frontend, '../investigation-game-backend/config/evidence-template-catalog.json');
const assetsOutput = join(definitionsRoot, '../document-assets.generated.json');
const assetGroups = ['signature', 'fingerprint', 'stamp'];
const keyPattern = /^[a-z][a-z0-9_]*$/;
export const isDocumentAssetFile = name => /\.(?:svg|png)$/i.test(name) || name === 'labels.json';
const translated = value => value && ['en', 'ar'].every(locale => typeof value[locale] === 'string' && value[locale].trim());

function discoverDocumentAssets() {
  return Object.fromEntries(assetGroups.map(group => {
    const folder = `${group}s`;
    const directory = join(documentAssetsRoot, folder);
    const labelsPath = join(directory, 'labels.json');
    const labels = existsSync(labelsPath) ? JSON.parse(readFileSync(labelsPath, 'utf8')) : {};
    if (!labels || Array.isArray(labels) || typeof labels !== 'object') {
      throw new Error(`Expected a map of document asset labels in ${labelsPath}`);
    }
    const entries = new Map();
    const files = readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name !== 'labels.json' && isDocumentAssetFile(entry.name))
      .map(entry => entry.name)
      .sort();
    for (const file of files) {
      const stem = file.slice(0, -extname(file).length);
      const id = stem.toLowerCase().replaceAll('-', '_');
      if (!/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/i.test(stem) || entries.has(id)) {
        throw new Error(`Invalid or duplicate document asset name: ${join(directory, file)}`);
      }
      const fallback = stem.replace(/[-_]/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase());
      const override = Object.hasOwn(labels, id) ? labels[id] : {};
      if (!override || Array.isArray(override) || typeof override !== 'object' ||
        Object.entries(override).some(([key, value]) =>
          key === 'frame' ? group !== 'stamp' || typeof value !== 'boolean'
            : !['en', 'ar'].includes(key) || typeof value !== 'string' || !value.trim())) {
        throw new Error(`Invalid document asset labels for ${id} in ${labelsPath}`);
      }
      entries.set(id, {
        path: `/assets/documents/${folder}/${file}`,
        label: { en: override.en ?? fallback, ar: override.ar ?? override.en ?? fallback },
        ...(override.frame && { frame: true }),
      });
    }
    return [group, Object.fromEntries(entries)];
  }));
}

function validFields(fields, nested = false) {
  if (!Array.isArray(fields) || !fields.length) return false;
  const keys = new Set();
  return fields.every(field => {
    if (!field || !keyPattern.test(field.key) || typeof field.key !== 'string' || keys.has(field.key) || !translated(field.label) ||
      (field.required !== undefined && typeof field.required !== 'boolean')) return false;
    keys.add(field.key);
    const bounded = Number.isSafeInteger(field.max) && field.max > 0;
    if (field.kind === 'rows') return !nested && bounded && validFields(field.fields, true);
    if (field.kind === 'image') return !nested;
    if (field.kind === 'asset') return !nested && assetGroups.includes(field.group);
    if (field.kind === 'date') return true;
    return ['text', 'textarea'].includes(field.kind) && bounded;
  });
}

function validPrefill(definition) {
  const prefill = definition.characterPrefill;
  if (prefill === undefined) return true;
  return prefill && definition.fields.some(field => field.key === prefill.name && field.kind === 'text') &&
    (prefill.portrait === undefined || definition.fields.some(field => field.key === prefill.portrait && field.kind === 'image'));
}

export function syncEvidenceCatalog({ check = false } = {}) {
  const assets = discoverDocumentAssets();
  const paths = readdirSync(definitionsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).flatMap(entry => {
    const root = join(definitionsRoot, entry.name);
    return readdirSync(root, { withFileTypes: true }).filter(version => version.isDirectory() && version.name.startsWith('v'))
      .map(version => ({ id: entry.name, version: version.name, path: join(root, version.name, 'definition.json') }));
  });
  const unique = new Set();
  const catalog = paths.map(({ id, version, path }) => {
    const definition = JSON.parse(readFileSync(path, 'utf8'));
    if (definition.id !== id || !keyPattern.test(id) || !Number.isSafeInteger(definition.version) || definition.version < 1 ||
      version !== `v${definition.version}` || !translated(definition.name) || !translated(definition.category) ||
      !Array.isArray(definition.types) || definition.types.length === 0 ||
      !definition.types.every(type => ['document', 'forensic'].includes(type)) || new Set(definition.types).size !== definition.types.length ||
      !validFields(definition.fields) || !validPrefill(definition) || !existsSync(join(dirname(path), 'Layout.tsx'))) {
      throw new Error(`Invalid evidence template: ${path}`);
    }
    const key = `${id}:${definition.version}`;
    if (unique.has(key)) throw new Error(`Duplicate evidence template: ${key}`);
    unique.add(key);
    return {
      ...definition,
      fields: definition.fields.map(field => field.kind === 'asset' ? {
        ...field,
        assetIds: Object.keys(assets[field.group]),
      } : field),
    };
  }).sort((a, b) => a.id.localeCompare(b.id, 'en') || a.version - b.version);
  for (const [path, data] of [[output, catalog], [assetsOutput, assets]]) {
    const generated = `${JSON.stringify(data, null, 2)}\n`;
    if (existsSync(path) && readFileSync(path, 'utf8').replaceAll('\r\n', '\n') === generated) continue;
    if (check) throw new Error(`Evidence catalog is stale: ${path}. Run npm run evidence:catalog and commit the generated files.`);
    writeFileSync(path, generated);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncEvidenceCatalog({ check: process.argv.includes('--check') });
}
