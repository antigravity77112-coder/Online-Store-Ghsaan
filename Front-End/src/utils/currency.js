import { getCurrencySymbol } from '../services/api';

export const DISPLAY_CURRENCIES = [
  { id: 'YER_Sanaa', labelKey: 'settings.currencyYERSanaa' },
  { id: 'YER_Aden', labelKey: 'settings.currencyYERAden' },
  { id: 'SAR', labelKey: 'settings.currencySAR' },
  { id: 'USD', labelKey: 'settings.currencyUSD' },
];

export const DEFAULT_DISPLAY_CURRENCY = 'YER_Sanaa';
export const PREFERRED_CURRENCY_KEY = 'preferred_currency';

export const DEFAULT_EXCHANGE_RATES = {
  USD_to_YER_Sanaa: 550,
  USD_to_YER_Aden: 1700,
  USD_to_SAR: 3.75,
};

const CODE_ALIASES = {
  1: 'YER_Sanaa',
  2: 'YER_Aden',
  3: 'USD',
  4: 'SAR',
  5: 'EUR',
  YER: 'YER_Sanaa',
  YER_SANAA: 'YER_Sanaa',
  YER_ADEN: 'YER_Aden',
};

/** Module-level display state synced by CurrencyProvider */
let displayPreferred = DEFAULT_DISPLAY_CURRENCY;
let displayRates = { ...DEFAULT_EXCHANGE_RATES };

export function setDisplayCurrencyState(preferredCurrency, rates) {
  displayPreferred = migratePreferredCurrency(preferredCurrency);
  displayRates = normalizeRates(rates);
}

export function getDisplayCurrencyState() {
  return { preferredCurrency: displayPreferred, rates: displayRates };
}

export function normalizeCurrencyCode(currency) {
  if (currency == null || currency === '') return null;
  if (typeof currency === 'number') return CODE_ALIASES[currency] || null;
  const raw = String(currency).trim();
  return CODE_ALIASES[raw] || CODE_ALIASES[raw.toUpperCase()] || raw;
}

export function migratePreferredCurrency(value) {
  const code = normalizeCurrencyCode(value);
  if (!code) return DEFAULT_DISPLAY_CURRENCY;
  if (DISPLAY_CURRENCIES.some((c) => c.id === code)) return code;
  return DEFAULT_DISPLAY_CURRENCY;
}

export function loadPreferredCurrency() {
  try {
    return migratePreferredCurrency(localStorage.getItem(PREFERRED_CURRENCY_KEY));
  } catch {
    return DEFAULT_DISPLAY_CURRENCY;
  }
}

try {
  displayPreferred = loadPreferredCurrency();
} catch { /* SSR / private mode */ }

export function persistPreferredCurrency(currency) {
  const next = migratePreferredCurrency(currency);
  try {
    localStorage.setItem(PREFERRED_CURRENCY_KEY, next);
  } catch { /* ignore */ }
  return next;
}

export function normalizeRates(rates) {
  return {
    USD_to_YER_Sanaa: Number(rates?.USD_to_YER_Sanaa) || DEFAULT_EXCHANGE_RATES.USD_to_YER_Sanaa,
    USD_to_YER_Aden: Number(rates?.USD_to_YER_Aden) || DEFAULT_EXCHANGE_RATES.USD_to_YER_Aden,
    USD_to_SAR: Number(rates?.USD_to_SAR) || DEFAULT_EXCHANGE_RATES.USD_to_SAR,
  };
}

export function convertAmount(amount, fromCurrency, toCurrency, rates = displayRates) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  if (!from || !to || from === to) return value;

  const r = normalizeRates(rates);
  let usd = value;
  if (from === 'YER_Sanaa') usd = value / r.USD_to_YER_Sanaa;
  else if (from === 'YER_Aden') usd = value / r.USD_to_YER_Aden;
  else if (from === 'SAR') usd = value / r.USD_to_SAR;
  else if (from === 'USD') usd = value;
  else return value;

  if (to === 'YER_Sanaa') return usd * r.USD_to_YER_Sanaa;
  if (to === 'YER_Aden') return usd * r.USD_to_YER_Aden;
  if (to === 'SAR') return usd * r.USD_to_SAR;
  if (to === 'USD') return usd;
  return value;
}

function formatNumber(num) {
  const rounded = Math.round(num * 100) / 100;
  // Western digits + Arabic thousands separator (e.g. 8،000)
  if (rounded >= 1000) {
    const [intPart, decPart] = String(rounded).split('.');
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u060C');
    return decPart != null ? `${withSep}.${decPart}` : withSep;
  }
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

/** Format in native product currency (no conversion). e.g. 800 ريال (صنعاء) */
export function formatNativePrice(price, currency) {
  const num = Number(price);
  if (!Number.isFinite(num)) return '';
  const amount = formatNumber(num);
  const symbol = getCurrencySymbol(currency);
  if (!symbol) return amount;
  // Amount then label; in RTL the currency sits visually to the left of the digits
  return `${amount}\u00A0${symbol}`;
}

/**
 * Storefront display price: convert product currency → preferred display currency.
 * Uses module state set by CurrencyProvider (defaults to YER_Sanaa / ريال صنعاء).
 */
export function formatPrice(price, fromCurrency, preferredCurrency = displayPreferred, rates = displayRates) {
  const preferred = migratePreferredCurrency(preferredCurrency);
  const from = normalizeCurrencyCode(fromCurrency) || preferred;
  const converted = convertAmount(price, from, preferred, rates);
  return formatNativePrice(converted, preferred);
}

export function formatDisplayPrice(price, fromCurrency, preferredCurrency, rates) {
  return formatPrice(price, fromCurrency, preferredCurrency, rates);
}
