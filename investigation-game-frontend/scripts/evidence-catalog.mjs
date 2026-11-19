import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
export const definitionsRoot = join(frontend, 'src/features/evidence/presentation/templates');
const output = resolve(frontend, '../investigation-game-backend/config/evidence-template-catalog.json');
const keyPattern = /^[a-z][a-z0-9_]*$/;
const translated = value => value && ['en', 'ar'].every(locale => typeof value[locale] === 'string' && value[locale].trim());

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
    return definition;
  }).sort((a, b) => a.id.localeCompare(b.id, 'en') || a.version - b.version);
  const generated = `${JSON.stringify(catalog, null, 2)}\n`;
  if (existsSync(output) && readFileSync(output, 'utf8').replaceAll('\r\n', '\n') === generated) return;
  if (check) throw new Error('Evidence catalog is stale. Run npm run evidence:catalog and commit the generated catalog.');
  writeFileSync(output, generated);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncEvidenceCatalog({ check: process.argv.includes('--check') });
}
