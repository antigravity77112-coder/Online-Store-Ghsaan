const Joi = require('joi');

const changeRoleSchema = Joi.object({
  newRole: Joi.string().valid('Admin', 'Buyer').required()
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', '1', '2', '3', '4', '5', '6').required()
});

module.exports = { changeRoleSchema, updateOrderStatusSchema };
