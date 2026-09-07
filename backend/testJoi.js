const Joi = require('joi');
const { idParamSchema } = require('./src/validations/commonValidation');

const res = idParamSchema.validate({ id: 'b63690d5-5d9c-4573-beea-e61ef0630b3d' });
console.log('Result for UUID:', res);
