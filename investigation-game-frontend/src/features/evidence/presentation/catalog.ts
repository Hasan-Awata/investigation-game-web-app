import { lazy, type ComponentType } from 'react';
import type { Definition, Locale, Template, Values } from '../model';
export type PageSelection = {
  index?: number;
  onPageCountChange: (count: number) => void;
};
export type LayoutProps = { values: Values; locale: Locale; pageLimit?: number; pageSelection?: PageSelection };

const definitions = import.meta.glob<Definition>('./templates/*/v*/definition.json', { eager: true, import: 'default' });
const layouts = import.meta.glob<{ default: ComponentType<LayoutProps> }>('./templates/*/v*/Layout.tsx');
const catalog = Object.entries(definitions).map(([path, definition]) => ({
  ...definition,
  Layout: lazy(layouts[path.replace('definition.json', 'Layout.tsx')]),
}));

export const templateDefinition = (id: string, version: number) => catalog.find(entry => entry.id === id && entry.version === version);
export const latestTemplates = (type: string) => catalog.filter(entry => entry.types.some(value => value === type) &&
  !catalog.some(other => other.id === entry.id && other.version > entry.version && other.types.some(value => value === type)));

export function readTemplate(metadata: unknown): Template | undefined {
  if (!metadata || typeof metadata !== 'object' || !('template' in metadata)) return;
  const entry = metadata.template;
  if (!entry || typeof entry !== 'object' || !('id' in entry) || typeof entry.id !== 'string' ||
    !('version' in entry) || typeof entry.version !== 'number' || !('values' in entry) ||
    !entry.values || typeof entry.values !== 'object') return;
  // Laravel's array cast serializes an empty field map as an empty JSON array.
  if (Array.isArray(entry.values)) {
    if (entry.values.length === 0) return { id: entry.id, version: entry.version, values: {} };
    return;
  }
  return { id: entry.id, version: entry.version, values: entry.values as Values };
}

export function upgradeValues(source: Definition, target: Definition, values: Values): Values {
  const upgraded: Values = {};
  for (const field of target.fields) {
    const old = source.fields.find(candidate => candidate.key === field.key);
    const value = values[field.key];
    if (old?.kind !== field.kind || value === undefined) continue;
    if (field.kind === 'rows' && old.kind === 'rows' && Array.isArray(value)) {
      upgraded[field.key] = value.map(row => Object.fromEntries(field.fields.flatMap(column =>
        old.fields.some(previous => previous.key === column.key && previous.kind === column.kind) && row[column.key] !== undefined
          ? [[column.key, row[column.key]]]
          : [])));
    } else if (typeof value === 'string') upgraded[field.key] = value;
  }
  return upgraded;
}
