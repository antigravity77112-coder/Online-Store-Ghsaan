const Joi = require('joi');
const { isValidHexColor } = require('../config/siteConfigDefaults');

const optionalUrl = Joi.string().trim().max(1000).allow('', null).custom((value, helpers) => {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) return helpers.error('any.invalid');
    return value;
  } catch {
    if (value.startsWith('/')) return value;
    return helpers.error('any.invalid');
  }
});

const optionalString = (max) => Joi.string().trim().max(max).allow('', null);

const themeSchema = Joi.object({
  primary: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  secondary: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  accent: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  background: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  surface: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  text: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  textMuted: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  border: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  success: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  warning: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
  error: Joi.string().custom((v, h) => (isValidHexColor(v) ? v : h.error('any.invalid'))),
}).min(1);

const sectionSchema = Joi.object({
  title: optionalString(120),
  subtitle: optionalString(200),
  visible: Joi.boolean(),
});

const homepageSchema = Joi.object({
  offerBeltVisible: Joi.boolean(),
  sections: Joi.object().pattern(Joi.string(), sectionSchema),
}).min(1);

const siteConfigUpdateSchema = Joi.object({
  aboutUsText: optionalString(5000),
  contactEmail: optionalString(200),
  contactPhone: optionalString(50),
  shippingOfferText: optionalString(500),
  facebookUrl: optionalUrl,
  twitterUrl: optionalUrl,
  whatsappUrl: optionalUrl,
  whatsappContacts: Joi.array().max(4).items(
    Joi.object({
      label: optionalString(80),
      url: Joi.string().trim().max(1000).required(),
    }),
  ).allow(null),
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  telegramUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  threadsUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  seoTitle: optionalString(120),
  seoDescription: optionalString(500),
  siteName: optionalString(120),
  siteShortName: optionalString(60),
  appName: optionalString(120),
  tagline: optionalString(200),
  siteDescription: optionalString(500),
  copyrightText: optionalString(300),
  logoUrl: optionalUrl,
  logoDarkUrl: optionalUrl,
  logoMobileUrl: optionalUrl,
  logoMobileDarkUrl: optionalUrl,
  faviconUrl: optionalUrl,
  ogImageUrl: optionalUrl,
  ogTitle: optionalString(120),
  ogDescription: optionalString(500),
  address: optionalString(500),
  mapUrl: optionalUrl,
  footerText: optionalString(1000),
  footerLinks: Joi.alternatives().try(Joi.object(), Joi.array(), Joi.valid(null)),
  themeConfig: themeSchema,
  homepageConfig: homepageSchema,
}).min(1);

const uploadAssetSchema = Joi.object({
  field: Joi.string().valid(
    'logoUrl', 'logoDarkUrl', 'logoMobileUrl', 'logoMobileDarkUrl', 'faviconUrl', 'ogImageUrl'
  ).required(),
});

module.exports = {
  siteConfigUpdateSchema,
  uploadAssetSchema,
};
