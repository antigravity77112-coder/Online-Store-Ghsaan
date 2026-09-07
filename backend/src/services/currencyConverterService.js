const exchangeRatesService = require('./exchangeRatesService');

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

const DEFAULT_RATES = {
  ...exchangeRatesService.DEFAULT_RATES,
  USD_to_EUR: 0.92,
};

function normalizeCode(currency) {
  if (currency == null || currency === '') return null;
  if (typeof currency === 'number') return CODE_ALIASES[currency] || null;
  const raw = String(currency).trim();
  return CODE_ALIASES[raw] || CODE_ALIASES[raw.toUpperCase()] || raw;
}

class CurrencyConverterService {
  constructor() {
    this.applyRates({
      USD_to_YER_Sanaa: parseFloat(process.env.USD_TO_YER_SANAA_RATE) || DEFAULT_RATES.USD_to_YER_Sanaa,
      USD_to_YER_Aden: parseFloat(process.env.USD_TO_YER_ADEN_RATE) || DEFAULT_RATES.USD_to_YER_Aden,
      USD_to_SAR: parseFloat(process.env.USD_TO_SAR_RATE) || DEFAULT_RATES.USD_to_SAR,
    });
    this.usdToEurRate = DEFAULT_RATES.USD_to_EUR;
  }

  applyRates(rates) {
    const next = exchangeRatesService.normalizeRates(rates);
    this.usdToYerSanaaRate = next.USD_to_YER_Sanaa;
    this.usdToYerAdenRate = next.USD_to_YER_Aden;
    this.usdToSarRate = next.USD_to_SAR;
  }

  async reloadFromDb() {
    const rates = await exchangeRatesService.getExchangeRates();
    this.applyRates(rates);
    return rates;
  }

  /** @deprecated Prefer reloadFromDb — kept for older call sites */
  reloadFromFile() {
    return this.reloadFromDb();
  }

  /**
   * Convert an amount from one currency to another.
   * Accepts string codes (USD, SAR, YER_Sanaa, YER_Aden) or legacy numeric enums.
   */
  convert(amount, fromCurrency, toCurrency) {
    const from = normalizeCode(fromCurrency);
    const to = normalizeCode(toCurrency);
    const value = Number(amount) || 0;

    if (!from || !to) throw new Error(`Unsupported currency: ${fromCurrency} → ${toCurrency}`);
    if (from === to) return value;

    let amountInUsd;
    switch (from) {
      case 'YER_Sanaa':
        amountInUsd = value / this.usdToYerSanaaRate;
        break;
      case 'YER_Aden':
        amountInUsd = value / this.usdToYerAdenRate;
        break;
      case 'SAR':
        amountInUsd = value / this.usdToSarRate;
        break;
      case 'EUR':
        amountInUsd = value / this.usdToEurRate;
        break;
      case 'USD':
        amountInUsd = value;
        break;
      default:
        throw new Error(`Unsupported currency: ${fromCurrency}`);
    }

    switch (to) {
      case 'YER_Sanaa':
        return amountInUsd * this.usdToYerSanaaRate;
      case 'YER_Aden':
        return amountInUsd * this.usdToYerAdenRate;
      case 'SAR':
        return amountInUsd * this.usdToSarRate;
      case 'EUR':
        return amountInUsd * this.usdToEurRate;
      case 'USD':
        return amountInUsd;
      default:
        throw new Error(`Unsupported currency: ${toCurrency}`);
    }
  }
}

module.exports = new CurrencyConverterService();
