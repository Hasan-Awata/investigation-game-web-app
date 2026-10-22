import { useTranslation } from 'react-i18next';
import styles from './LanguageToggle.module.css';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'ar';
  const nextLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
  const label = nextLanguage === 'en' ? 'Switch to English' : 'التبديل إلى العربية';

  return (
    <button
      type="button"
      className={styles.languageToggle}
      onClick={() => void i18n.changeLanguage(nextLanguage)}
      aria-label={label}
      title={label}
    >
      {currentLanguage.toUpperCase()}
    </button>
  );
}
