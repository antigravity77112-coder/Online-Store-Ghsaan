const Joi = require('joi');

const createProductSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).required(),
  price: Joi.number().positive().required(),
  currency: Joi.string().valid('USD', 'YER_Sanaa', 'YER_Aden', 'SAR').required(),
  condition: Joi.number().valid(1, 2, 3).required(),
  stockQuantity: Joi.number().integer().min(0).required(),
  categoryId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
  categoryIds: Joi.array().items(
    Joi.string().guid({ version: ['uuidv4', 'uuidv5'] })
  ).max(20).optional(),
  showStock: Joi.boolean().optional(),
  searchKeywords: Joi.string().max(1000).allow(null, '').optional(),
  isPromoted: Joi.boolean().optional(),
  isTrending: Joi.boolean().optional(),
  imageUrls: Joi.array().items(Joi.string().uri().allow(null, '')).max(5).optional(),
  discountPrice: Joi.number().positive().allow(null, '').optional(),
  promotionLabel: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('Draft', 'Active', 'OutOfStock', 'Archived').optional(),
  sku: Joi.string().allow(null, '').optional(),
  hasVariants: Joi.boolean().optional(),
  lowStockThreshold: Joi.number().integer().min(0).optional(),
  metaTitle: Joi.string().allow(null, '').optional(),
  metaDescription: Joi.string().allow(null, '').optional(),
  brandId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null).optional(),
  scentIds: Joi.array().items(
    Joi.string().guid({ version: ['uuidv4', 'uuidv5'] })
  ).optional(),
  isHidden: Joi.boolean().optional(), // legacy support
  images: Joi.array().items(Joi.object({
    url: Joi.string().uri().required(),
    altText: Joi.string().allow(null, '').optional(),
  })).max(5).optional(),
  attributes: Joi.array().items(Joi.object({
    categoryAttributeId: Joi.string().uuid().required(),
    value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).required(),
  })).optional(),
  specs: Joi.array().items(Joi.object({
    name: Joi.string().allow('', null).optional(),
    value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).allow('', null).optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
  })).optional(),
  variants: Joi.array().items(Joi.object({
    sku: Joi.string().required(),
    price: Joi.number().positive().required(),
    discountPrice: Joi.number().positive().allow(null, '').optional(),
    stockQuantity: Joi.number().integer().min(0).required(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    imageUrl: Joi.string().uri().allow(null, '').optional(),
    attributes: Joi.array().items(Joi.object({
      categoryAttributeId: Joi.string().uuid().required(),
      value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).required(),
    })).optional(),
  })).optional(),
});

// Shared attributes sub-schema
const attributesSchema = Joi.array().items(
  Joi.object({
    categoryAttributeId: Joi.string().uuid().required(),
    value: Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.boolean()
    ).required(),
  })
).optional();

const updateProductSchema = createProductSchema.keys({
  id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
  attributes: attributesSchema,
});

module.exports = { createProductSchema, updateProductSchema };
