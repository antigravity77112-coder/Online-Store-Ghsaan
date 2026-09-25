const Joi = require('joi');

const PLACEMENTS = ['promo_home', 'announcement', 'category', 'product', 'sidebar', 'footer', 'popup', 'hero'];
const STATUSES   = ['active', 'draft', 'scheduled', 'archived'];
const ALIGNS     = ['right', 'center', 'left'];

const UUID = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });

const peekProductIdsSchema = Joi.array().items(UUID).max(2).optional().allow(null);

// ─── Create Banner ───────────────────────────────────────────────────────────
const createBannerSchema = Joi.object({
  title:          Joi.string().trim().max(200).allow('', null).optional().default(''),
  subtitle:       Joi.string().trim().max(300).allow('', null).optional(),
  description:    Joi.string().trim().max(1000).allow('', null).optional(),
  ctaText:        Joi.string().trim().max(100).allow('', null).optional(),
  ctaUrl:         Joi.string().trim().uri({ allowRelative: true }).max(500).allow('', null).optional(),
  imageUrl:       Joi.string().trim().uri().max(1000).allow('', null).optional(),
  mobileImageUrl: Joi.string().trim().uri().max(1000).allow('', null).optional(),
  bgColor:        Joi.string().trim().max(50).allow('', null).optional(),
  textColor:      Joi.string().trim().max(50).allow('', null).optional(),
  scrollSpeed:    Joi.number().integer().min(8).max(120).default(40),
  textAlign:      Joi.string().valid(...ALIGNS).default('right'),
  overlayOpacity: Joi.number().integer().min(0).max(100).default(30),
  placement:      Joi.string().valid(...PLACEMENTS).default('promo_home'),
  status:         Joi.string().valid(...STATUSES).default('draft'),
  showOnDesktop:  Joi.boolean().default(true),
  showOnMobile:   Joi.boolean().default(true),
  priority:       Joi.number().integer().min(0).default(0),
  scheduledAt:    Joi.date().iso().allow(null).optional(),
  expiresAt:      Joi.date().iso().allow(null).optional(),
  peekProductIds: peekProductIdsSchema,
});

// ─── Update Banner ────────────────────────────────────────────────────────────
const updateBannerSchema = Joi.object({
  title:          Joi.string().trim().max(200).allow('', null).optional(),
  subtitle:       Joi.string().trim().max(300).allow('', null).optional(),
  description:    Joi.string().trim().max(1000).allow('', null).optional(),
  ctaText:        Joi.string().trim().max(100).allow('', null).optional(),
  ctaUrl:         Joi.string().trim().uri({ allowRelative: true }).max(500).allow('', null).optional(),
  imageUrl:       Joi.string().trim().uri().max(1000).allow('', null).optional(),
  mobileImageUrl: Joi.string().trim().uri().max(1000).allow('', null).optional(),
  bgColor:        Joi.string().trim().max(50).allow('', null).optional(),
  textColor:      Joi.string().trim().max(50).allow('', null).optional(),
  scrollSpeed:    Joi.number().integer().min(8).max(120).optional(),
  textAlign:      Joi.string().valid(...ALIGNS).optional(),
  overlayOpacity: Joi.number().integer().min(0).max(100).optional(),
  placement:      Joi.string().valid(...PLACEMENTS).optional(),
  status:         Joi.string().valid(...STATUSES).optional(),
  showOnDesktop:  Joi.boolean().optional(),
  showOnMobile:   Joi.boolean().optional(),
  priority:       Joi.number().integer().min(0).optional(),
  scheduledAt:    Joi.date().iso().allow(null).optional(),
  expiresAt:      Joi.date().iso().allow(null).optional(),
  peekProductIds: peekProductIdsSchema,
}).min(1);

// ─── Track Event ──────────────────────────────────────────────────────────────
const trackBannerSchema = Joi.object({
  type: Joi.string().valid('impression', 'click').required(),
});

// ─── Reorder ──────────────────────────────────────────────────────────────────
const reorderBannersSchema = Joi.object({
  ids: Joi.array().items(Joi.string().guid()).min(1).required(),
});

module.exports = {
  createBannerSchema,
  updateBannerSchema,
  trackBannerSchema,
  reorderBannersSchema,
};
