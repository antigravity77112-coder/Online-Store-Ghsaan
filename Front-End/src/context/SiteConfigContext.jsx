import React, { createContext, useContext, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import * as api from '../services/api';
import {
  mergeSiteConfig,
  applyThemeVariables,
  applySiteMediaToDocument,
  DEFAULT_SITE_CONFIG,
} from '../config/siteConfigDefaults';
import { preloadSiteLogo } from '../utils/preloadSiteLogo';
import { useTheme } from './ThemeContext';

const SiteConfigContext = createContext({
  config: DEFAULT_SITE_CONFIG,
  isLoading: true,
  mutate: () => {},
});

export const SITE_CONFIG_KEY = 'siteConfig';

export function SiteConfigProvider({ children }) {
  const { isDark } = useTheme();
  const { data, error, isLoading, mutate } = useSWR(
    SITE_CONFIG_KEY,
    api.getSiteConfig,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 5000,
      // No fallbackData — logos must come from the DB response, not local defaults.
    },
  );

  const config = useMemo(() => mergeSiteConfig(data), [data]);

  const contextValue = useMemo(
    () => ({
      config,
      isLoading: Boolean(isLoading && !error),
      mutate,
      error,
    }),
    [config, isLoading, error, mutate],
  );

  useEffect(() => {
    applyThemeVariables(config.theme);
  }, [config.theme]);

  useEffect(() => {
    applySiteMediaToDocument(config);
  }, [config]);

  // Warm DB logo as soon as config arrives (splash + header).
  useEffect(() => {
    if (!data) return;
    preloadSiteLogo(config, { dark: isDark });
  }, [data, config, isDark]);

  return (
    <SiteConfigContext.Provider value={contextValue}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

export default SiteConfigContext;
