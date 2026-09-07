export const LOCALE_STORAGE_KEY = 'preferred_language';
export const DEFAULT_LOCALE = 'ar';
export const SUPPORTED_LOCALES = ['ar', 'en'];

export function normalizeLocale(value) {
  return value === 'en' ? 'en' : 'ar';
}

export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const lang = (navigator.language || '').toLowerCase();
  if (lang.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

export function getDocumentDirection(locale) {
  return normalizeLocale(locale) === 'ar' ? 'rtl' : 'ltr';
}

export function applyDocumentDirection(locale) {
  if (typeof document === 'undefined') return;
  const lng = normalizeLocale(locale);
  const dir = getDocumentDirection(lng);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
}

export function getStoredLocale() {
  if (typeof localStorage === 'undefined') return detectBrowserLocale();
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) return normalizeLocale(stored);
  } catch {
    /* ignore */
  }
  return detectBrowserLocale();
}

export function persistLocale(locale) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(locale));
  } catch {
    /* ignore */
  }
}
