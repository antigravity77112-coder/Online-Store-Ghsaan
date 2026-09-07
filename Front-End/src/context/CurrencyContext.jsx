import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as api from '../services/api';
import {
  DEFAULT_DISPLAY_CURRENCY,
  DEFAULT_EXCHANGE_RATES,
  convertAmount,
  formatDisplayPrice,
  formatNativePrice,
  loadPreferredCurrency,
  migratePreferredCurrency,
  normalizeRates,
  persistPreferredCurrency,
  setDisplayCurrencyState,
} from '../utils/currency';

const CurrencyContext = createContext(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

/** Safe hook for components that may render outside provider (falls back to defaults). */
export function useFormatDisplayPrice() {
  const ctx = useContext(CurrencyContext);
  const preferredCurrency = ctx?.preferredCurrency ?? DEFAULT_DISPLAY_CURRENCY;
  const rates = ctx?.rates ?? DEFAULT_EXCHANGE_RATES;
  return useCallback(
    (price, fromCurrency) => formatDisplayPrice(price, fromCurrency, preferredCurrency, rates),
    [preferredCurrency, rates],
  );
}

export function CurrencyProvider({ children }) {
  const [preferredCurrency, setPreferredCurrencyState] = useState(loadPreferredCurrency);
  const [rates, setRatesState] = useState({ ...DEFAULT_EXCHANGE_RATES });

  useEffect(() => {
    setDisplayCurrencyState(preferredCurrency, rates);
  }, [preferredCurrency, rates]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.getExchangeRates();
        if (mounted && data) setRatesState(normalizeRates(data));
      } catch {
        /* keep defaults */
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setPreferredCurrency = useCallback((currency) => {
    const next = persistPreferredCurrency(currency);
    setPreferredCurrencyState(next);
  }, []);

  const setRates = useCallback((next) => {
    setRatesState(normalizeRates(next));
  }, []);

  const refreshRates = useCallback(async () => {
    try {
      const data = await api.getExchangeRates();
      if (data) setRatesState(normalizeRates(data));
    } catch {
      /* keep current */
    }
  }, []);

  const formatPrice = useCallback(
    (price, fromCurrency) => formatDisplayPrice(price, fromCurrency, preferredCurrency, rates),
    [preferredCurrency, rates],
  );

  const convert = useCallback(
    (amount, fromCurrency, toCurrency = preferredCurrency) =>
      convertAmount(amount, fromCurrency, toCurrency, rates),
    [preferredCurrency, rates],
  );

  const value = useMemo(
    () => ({
      preferredCurrency,
      rates,
      setPreferredCurrency,
      setRates,
      refreshRates,
      formatPrice,
      formatNativePrice,
      convertAmount: convert,
      migratePreferredCurrency,
    }),
    [preferredCurrency, rates, setPreferredCurrency, setRates, refreshRates, formatPrice, convert],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export default CurrencyContext;
