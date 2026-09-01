import { useTranslation } from 'react-i18next';
import { translations } from '@/locales/ar/translationAdmin';

export type AdminTranslationSchema = typeof translations;

export function useAdminTranslation() {
  const { t } = useTranslation('admin');

  const adminT = buildKeyMap(translations, (path) => t(path)) as AdminTranslationSchema;

  return { adminT };
}

function buildKeyMap(obj: any, tFunc: (path: string) => string, currentPath = ''): any {
  const result: any = {};
  for (const key in obj) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = buildKeyMap(obj[key], tFunc, fullPath);
    } else {
      result[key] = tFunc(fullPath);
    }
  }
  return result;
}