import './i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocaleProvider } from './context/LocaleContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ThemeProvider } from './context/ThemeContext';
import { SiteConfigProvider } from './context/SiteConfigContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { HelmetProvider } from 'react-helmet-async';
import { SWRConfig } from 'swr';
import App from './App';
import './fonts.css';
import './index.css';
import * as api from './services/api';
import {
  preloadSiteLogo,
  warmSiteLogoFromCache,
  waitForSiteLogo,
  openSiteLogoGate,
} from './utils/preloadSiteLogo';

// Boot: paint last-known DB logo immediately, then refresh from /config before React effects.
const __bootDark =
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains('dark');
const __cachedLogo = warmSiteLogoFromCache(__bootDark);
if (__cachedLogo) {
  waitForSiteLogo(__cachedLogo, 1800);
} else {
  // Failsafe if /config is slow on a cold first visit.
  window.setTimeout(openSiteLogoGate, 2200);
}
api
  .getSiteConfig()
  .then((cfg) => {
    if (!cfg) {
      openSiteLogoGate();
      return;
    }
    const href = preloadSiteLogo(cfg, { dark: __bootDark });
    return href ? waitForSiteLogo(href, 2000) : openSiteLogoGate();
  })
  .catch(() => openSiteLogoGate());

/** Persist only stable storefront keys — avoid dumping product/search filter cache. */
const SWR_PERSIST_KEY_PREFIXES = ['siteConfig', 'categories', 'brands'];

function shouldPersistSwrKey(key) {
  if (typeof key === 'string') {
    return SWR_PERSIST_KEY_PREFIXES.some((p) => key === p || key.startsWith(`${p}`));
  }
  if (Array.isArray(key) && typeof key[0] === 'string') {
    return SWR_PERSIST_KEY_PREFIXES.some((p) => key[0] === p || key[0].startsWith(`${p}`));
  }
  return false;
}

function localStorageProvider() {
  if (typeof window === 'undefined') return new Map();
  let map = new Map();
  try {
    const raw = localStorage.getItem('app-cache');
    const entries = raw ? JSON.parse(raw) : [];
    if (Array.isArray(entries)) map = new Map(entries);
  } catch {
    map = new Map();
  }
  window.addEventListener('beforeunload', () => {
    try {
      const stable = Array.from(map.entries()).filter(([key]) => shouldPersistSwrKey(key));
      localStorage.setItem('app-cache', JSON.stringify(stable.slice(0, 30)));
    } catch { /* ignore quota / private mode */ }
  });
  return map;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <LocaleProvider>
            <CartProvider>
              <FavoritesProvider>
                <SWRConfig
                  value={{
                    provider: localStorageProvider,
                    keepPreviousData: true,
                    revalidateOnFocus: false,
                    revalidateIfStale: true,
                    dedupingInterval: 10000,
                    errorRetryCount: 3,
                    shouldRetryOnError: true
                  }}
                >
                  <SiteConfigProvider>
                    <CurrencyProvider>
                      <App />
                    </CurrencyProvider>
                  </SiteConfigProvider>
                </SWRConfig>
              </FavoritesProvider>
            </CartProvider>
            </LocaleProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
