const Joi = require('joi');
const { idParamSchema } = require('./src/validations/commonValidation');

const v1 = '11bf5b37-e0b8-11e3-8b68-f68cd816a7f0'; // v1
const v4 = 'b63690d5-5d9c-4573-beea-e61ef0630b3d'; // v4
const v7 = '018b2f19-e79e-7d6a-a5c2-f6cb10df8e7f'; // v7

console.log('v1:', idParamSchema.validate({ id: v1 }).error?.message || 'Valid');
console.log('v4:', idParamSchema.validate({ id: v4 }).error?.message || 'Valid');
console.log('v7:', idParamSchema.validate({ id: v7 }).error?.message || 'Valid');
