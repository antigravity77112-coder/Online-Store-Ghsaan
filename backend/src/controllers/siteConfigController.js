const siteConfigService = require('../services/siteConfigService');
const { buildWebManifest } = require('../config/siteConfigDefaults');
const { uploadBuffer } = require('../utils/cloudinaryClient');

class SiteConfigController {
  async getPublicConfig(req, res) {
    const client = req.headers['x-client-type'] === 'mobile' ? 'mobile' : 'web';
    const config = await siteConfigService.getPublicConfig(client);
    res.set('Cache-Control', 'public, max-age=300');
    res.json(config);
  }

  async getAdminConfig(req, res) {
    const config = await siteConfigService.getAdminConfig();
    res.json(config);
  }

  async updateConfig(req, res) {
    const config = await siteConfigService.updateConfig(req.body);
    res.json(config);
  }

  async uploadAsset(req, res) {
    if (!req.file?.buffer) {
      res.status(400);
      throw new Error('No file uploaded');
    }
    const field = req.body?.field;
    const allowed = [
      'logoUrl', 'logoDarkUrl', 'logoMobileUrl', 'logoMobileDarkUrl',
      'faviconUrl', 'ogImageUrl',
    ];
    if (!field || !allowed.includes(field)) {
      res.status(400);
      throw new Error('Invalid asset field. Allowed: logoUrl, logoDarkUrl, logoMobileUrl, logoMobileDarkUrl, faviconUrl, ogImageUrl');
    }

    const isLogoField = [
      'logoUrl', 'logoDarkUrl', 'logoMobileUrl', 'logoMobileDarkUrl', 'faviconUrl',
    ].includes(field);
    // Logos/favicons keep alpha; OG share images stay as uploaded (readable from DB URL).
    const url = await uploadBuffer(req.file.buffer, {
      folder: 'site-assets',
      preserveFormat: isLogoField || field === 'ogImageUrl',
    });
    const config = await siteConfigService.updateConfig({ [field]: url });
    res.json({ url, field, config });
  }

  async getWebManifest(req, res) {
    const config = await siteConfigService.getPublicConfig('web');
    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const manifest = buildWebManifest(config, baseUrl);
    res.set('Cache-Control', 'public, max-age=300');
    res.type('application/manifest+json');
    res.json(manifest);
  }
}

module.exports = new SiteConfigController();
