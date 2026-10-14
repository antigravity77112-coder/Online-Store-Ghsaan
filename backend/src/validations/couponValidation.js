const Joi = require('joi');

const discountType = Joi.string().valid('Percent', 'Amount');

const createCouponSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  code: Joi.string().trim().uppercase().min(3).max(32).pattern(/^[A-Z0-9_-]+$/).optional().allow('', null),
  discountType: discountType.default('Percent'),
  discountPercent: Joi.when('discountType', {
    is: 'Amount',
    then: Joi.number().integer().min(1).max(100).optional().allow(null),
    otherwise: Joi.number().integer().min(1).max(100).required(),
  }),
  discountFixedAmount: Joi.when('discountType', {
    is: 'Amount',
    then: Joi.number().positive().max(999999999).required(),
    otherwise: Joi.number().positive().max(999999999).optional().allow(null),
  }),
  validityDays: Joi.number().integer().min(1).max(3650).required(),
  usageLimit: Joi.number().integer().min(1).max(100000).default(1),
  adminStatus: Joi.string().valid('Draft', 'Active').default('Draft'),
  internalNotes: Joi.string().trim().max(2000).allow('', null).optional(),
});

const updateCouponSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  code: Joi.string().trim().uppercase().min(3).max(32).pattern(/^[A-Z0-9_-]+$/).optional(),
  discountType: discountType.optional(),
  discountPercent: Joi.number().integer().min(1).max(100).optional().allow(null),
  discountFixedAmount: Joi.number().positive().max(999999999).optional().allow(null),
  validityDays: Joi.number().integer().min(1).max(3650).optional(),
  usageLimit: Joi.number().integer().min(1).max(100000).optional(),
  adminStatus: Joi.string().valid('Draft', 'Active', 'Disabled').optional(),
  internalNotes: Joi.string().trim().max(2000).allow('', null).optional(),
}).min(1);

const validateCouponSchema = Joi.object({
  code: Joi.string().trim().min(1).max(32).required(),
  cartSubtotal: Joi.number().min(0).optional().allow(null),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
};
