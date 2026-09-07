const Joi = require('joi');

const idParamSchema = Joi.object({
  id: Joi.string().guid().required()
});

module.exports = { idParamSchema };
