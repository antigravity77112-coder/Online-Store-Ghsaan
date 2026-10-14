const Joi = require('joi');

const createBrandSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'اسم العلامة التجارية مطلوب',
    'any.required': 'اسم العلامة التجارية مطلوب'
  }),
  slug: Joi.string().trim().optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  logoUrl: Joi.string().uri().optional().allow('', null),
  isActive: Joi.boolean().optional(),
});

const updateBrandSchema = Joi.object({
  name: Joi.string().trim().optional(),
  slug: Joi.string().trim().optional().allow('', null),
  description: Joi.string().trim().optional().allow('', null),
  logoUrl: Joi.string().uri().optional().allow('', null),
  isActive: Joi.boolean().optional(),
});

module.exports = { createBrandSchema, updateBrandSchema };
