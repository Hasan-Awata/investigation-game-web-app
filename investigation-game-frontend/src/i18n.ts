import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 1. Keep your existing game translations (JSON)
import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';

// 2. Import your new admin TypeScript objects
import { translations as adminAR } from './locales/ar/translationAdmin';
import { translations as adminEN } from './locales/en/translationAdmin';

const resources = {
  en: {
    translation: translationEN, // Your old game translations
    admin: adminEN             // Your new admin TS translations
  },
  ar: {
    translation: translationAR, // Your old game translations
    admin: adminAR             // Your new admin TS translations
  }
};

const supportedLanguages = ['ar', 'en'] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];

function getInitialLanguage(): SupportedLanguage {
  const storedLanguage = localStorage.getItem('app_lang');
  return supportedLanguages.includes(storedLanguage as SupportedLanguage)
    ? (storedLanguage as SupportedLanguage)
    : 'ar';
}

function applyLanguageDirection(language: string): void {
  const lang: SupportedLanguage = supportedLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

const initialLanguage = getInitialLanguage();
applyLanguageDirection(initialLanguage);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false 
    }
  });

i18n.on('languageChanged', (language) => {
  const supportedLanguage = supportedLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'ar';
  localStorage.setItem('app_lang', supportedLanguage);
  applyLanguageDirection(supportedLanguage);
});

export default i18n;
