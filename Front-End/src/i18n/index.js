import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../locales/ar.json';
import en from '../locales/en.json';
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  applyDocumentDirection,
  normalizeLocale,
} from './localeUtils';

export function initI18n(initialLocale) {
  const lng = normalizeLocale(initialLocale ?? getStoredLocale());

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: {
        ar: { translation: ar },
        en: { translation: en },
      },
      lng,
      fallbackLng: DEFAULT_LOCALE,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  } else if (i18n.language !== lng) {
    i18n.changeLanguage(lng);
  }

  applyDocumentDirection(lng);
  return lng;
}

initI18n();

export default i18n;
