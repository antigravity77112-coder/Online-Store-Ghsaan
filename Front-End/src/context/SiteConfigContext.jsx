import React, { createContext, useContext, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import * as api from '../services/api';
import {
  mergeSiteConfig,
  applyThemeVariables,
  applySiteMediaToDocument,
  DEFAULT_SITE_CONFIG,
} from '../config/siteConfigDefaults';

const SiteConfigContext = createContext({
  config: DEFAULT_SITE_CONFIG,
  isLoading: true,
  mutate: () => {},
});

export const SITE_CONFIG_KEY = 'siteConfig';

export function SiteConfigProvider({ children }) {
  const { data, error, isLoading, mutate } = useSWR(
    SITE_CONFIG_KEY,
    api.getSiteConfig,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 5000,
      fallbackData: DEFAULT_SITE_CONFIG,
    },
  );

  const config = useMemo(() => mergeSiteConfig(data), [data]);

  const contextValue = useMemo(
    () => ({
      config,
      isLoading: isLoading && !data && !error,
      mutate,
      error,
    }),
    [config, isLoading, data, error, mutate],
  );

  useEffect(() => {
    applyThemeVariables(config.theme);
  }, [config.theme]);

  useEffect(() => {
    applySiteMediaToDocument(config);
  }, [config]);

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
