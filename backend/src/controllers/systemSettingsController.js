const siteConfigService = require('../services/siteConfigService');
const exchangeRatesService = require('../services/exchangeRatesService');

class SystemSettingsController {
  async getExchangeRates(req, res) {
    try {
      const rates = await exchangeRatesService.getExchangeRates();
      res.json(rates);
    } catch (error) {
      throw error;
    }
  }

  async updateExchangeRates(req, res) {
    try {
      const { USD_to_YER_Sanaa, USD_to_YER_Aden, USD_to_SAR } = req.body;

      if (USD_to_YER_Sanaa == null || USD_to_YER_Aden == null) {
        res.status(400);
        throw new Error('Both USD_to_YER_Sanaa and USD_to_YER_Aden are required');
      }

      const sanaa = parseFloat(USD_to_YER_Sanaa);
      const aden = parseFloat(USD_to_YER_Aden);
      const sar = USD_to_SAR != null && USD_to_SAR !== ''
        ? parseFloat(USD_to_SAR)
        : exchangeRatesService.DEFAULT_RATES.USD_to_SAR;

      if (![sanaa, aden, sar].every((n) => Number.isFinite(n) && n > 0)) {
        res.status(400);
        throw new Error('Exchange rates must be positive numbers');
      }

      await exchangeRatesService.updateExchangeRates({
        USD_to_YER_Sanaa: sanaa,
        USD_to_YER_Aden: aden,
        USD_to_SAR: sar,
      });
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }

  /** GET /api/SystemSettings/store-info — backward compatible */
  async getStoreInfo(req, res) {
    try {
      const info = await siteConfigService.getStoreInfoLegacy();
      res.json(info);
    } catch (error) {
      throw error;
    }
  }

  /** PUT /api/SystemSettings/store-info — backward compatible */
  async updateStoreInfo(req, res) {
    try {
      const updatedInfo = await siteConfigService.updateStoreInfoLegacy(req.body);
      res.json(updatedInfo);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SystemSettingsController();
