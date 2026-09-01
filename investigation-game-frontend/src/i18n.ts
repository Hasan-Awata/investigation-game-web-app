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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', 
    fallbackLng: 'ar', 
    debug: false,
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;