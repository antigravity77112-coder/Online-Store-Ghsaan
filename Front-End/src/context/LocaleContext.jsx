import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import * as api from '../services/api';
import { useAuth } from './AuthContext';
import {
  applyDocumentDirection,
  getDocumentDirection,
  normalizeLocale,
  persistLocale,
} from '../i18n/localeUtils';

const LocaleContext = createContext(null);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function LocaleProvider({ children }) {
  const { i18n: i18nInstance } = useTranslation();
  const { user, isAuthenticated, checkAuthStatus } = useAuth();

  const language = normalizeLocale(i18nInstance.language);
  const dir = getDocumentDirection(language);
  const isRtl = dir === 'rtl';

  const changeLanguage = useCallback(async (locale, options = {}) => {
    const { persist = true, syncBackend = true } = options;
    const lng = normalizeLocale(locale);

    await i18n.changeLanguage(lng);
    applyDocumentDirection(lng);

    if (persist) {
      persistLocale(lng);
    }

    if (syncBackend && isAuthenticated) {
      try {
        await api.updateProfile({ preferredLanguage: lng });
        await checkAuthStatus();
      } catch (err) {
        console.error('Failed to sync language preference:', err);
      }
    }
  }, [isAuthenticated, checkAuthStatus]);

  useEffect(() => {
    if (!user?.preferredLanguage) return;
    const userLang = normalizeLocale(user.preferredLanguage);
    if (userLang !== normalizeLocale(i18n.language)) {
      changeLanguage(userLang, { persist: true, syncBackend: false });
    }
  }, [user?.preferredLanguage, changeLanguage]);

  const value = useMemo(
    () => ({ language, dir, isRtl, changeLanguage }),
    [language, dir, isRtl, changeLanguage],
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export default LocaleContext;
