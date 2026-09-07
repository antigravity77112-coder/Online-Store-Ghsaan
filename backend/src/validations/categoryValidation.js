const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().allow(null, '').optional(),
  description: Joi.string().allow(null, '').optional(),
  imageUrl: Joi.string().uri().allow(null, '').optional(),
  iconUrl: Joi.string().uri().allow(null, '').optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  metaTitle: Joi.string().allow(null, '').optional(),
  metaDescription: Joi.string().allow(null, '').optional(),
  parentId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).allow(null, '').optional()
});

const updateCategorySchema = createCategorySchema.keys({
  id: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).optional()
});

module.exports = { createCategorySchema, updateCategorySchema };
