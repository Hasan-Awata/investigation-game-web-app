import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { translations } from '@/locales/ar/translationAdmin';

export type AdminTranslationSchema = typeof translations;

/**
 * Resolves the entire admin translation tree against i18next once per language
 * instead of rebuilding ~500 `t()` lookups on every render. `t` and
 * `i18n.language` are the only inputs that can change the resolved values.
 */
export function useAdminTranslation() {
  const { t } = useTranslation('admin');

  const adminT = useMemo(
    () => buildKeyMap(translations, (path) => t(path)) as AdminTranslationSchema,
    [t],
  );

  return { adminT };
}

function buildKeyMap(obj: Record<string, unknown>, tFunc: (path: string) => string, currentPath = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = buildKeyMap(obj[key] as Record<string, unknown>, tFunc, fullPath);
    } else {
      result[key] = tFunc(fullPath);
    }
  }
  return result;
}