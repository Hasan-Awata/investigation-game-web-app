import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// You can remove LanguageDetector entirely if this game is exclusively Arabic
// import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  ar: {
    translation: translationAR
  }
};

i18n
  // .use(LanguageDetector) <-- Comment or remove this line
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // <-- ADD THIS LINE: Explicitly force Arabic as the active language
    fallbackLng: 'ar', 
    debug: false,
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;