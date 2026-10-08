import { useTranslation } from 'react-i18next';
import { translations } from '@/locales/ar/translationAdmin';

export type AdminTranslationSchema = typeof translations;

export function useAdminTranslation() {
  const { t } = useTranslation('admin');

  const adminT = buildKeyMap(translations, (path) => t(path)) as AdminTranslationSchema;

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