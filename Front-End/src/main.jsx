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
import './index.css';

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
      const appCache = JSON.stringify(Array.from(map.entries()).slice(0, 50));
      localStorage.setItem('app-cache', appCache);
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
