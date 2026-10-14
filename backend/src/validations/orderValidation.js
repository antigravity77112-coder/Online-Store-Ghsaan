const Joi = require('joi');

const orderItemSchema = Joi.object({
  productId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
  quantity: Joi.number().integer().positive().required()
});

const createOrderSchema = Joi.object({
  shippingAddress: Joi.string().min(5).max(500).required(),
  paymentMethod: Joi.string().valid('COD').optional(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  idempotencyKey: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).optional(),
  couponCode: Joi.string().trim().max(32).allow('', null).optional(),
});

module.exports = { createOrderSchema };
