const Joi = require('joi');

const createScentSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'اسم الرائحة مطلوب',
    'any.required': 'اسم الرائحة مطلوب',
  }),
  slug: Joi.string().trim().optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  imageUrl: Joi.string().uri().optional().allow('', null),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

const updateScentSchema = Joi.object({
  name: Joi.string().trim().optional(),
  slug: Joi.string().trim().optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  imageUrl: Joi.string().uri().optional().allow('', null),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

module.exports = { createScentSchema, updateScentSchema };
