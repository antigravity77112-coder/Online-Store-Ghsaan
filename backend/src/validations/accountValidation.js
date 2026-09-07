const Joi = require('joi');

const preferredLanguageField = Joi.string().valid('ar', 'en').optional().messages({
  'any.only': 'اللغة المدعومة هي العربية أو الإنجليزية فقط'
});

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'الاسم الكامل مطلوب',
    'string.min': 'الاسم يجب أن يكون 3 أحرف على الأقل',
    'any.required': 'الاسم الكامل مطلوب'
  }),
  phoneNumber: Joi.string().trim().required().messages({
    'string.empty': 'رقم الهاتف مطلوب',
    'any.required': 'رقم الهاتف مطلوب'
  }),

  password: Joi.string().min(8).max(100).required().messages({
    'string.empty': 'كلمة المرور مطلوبة',
    'string.min': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    'any.required': 'كلمة المرور مطلوبة'
  }),
  city: Joi.string().trim().required().messages({
    'string.empty': 'المدينة مطلوبة',
    'any.required': 'المدينة مطلوبة'
  }),
  address: Joi.string().trim().min(5).max(500).required().messages({
    'string.empty': 'العنوان التفصيلي مطلوب',
    'string.min': 'العنوان يجب أن يكون 5 أحرف على الأقل',
    'any.required': 'العنوان التفصيلي مطلوب'
  }),
  locationUrl: Joi.string().trim().uri().allow('', null).optional().messages({
    'string.uri': 'رابط خريطة Google غير صالح'
  }),
  preferredLanguage: preferredLanguageField
});

const loginSchema = Joi.object({
  phoneNumber: Joi.string().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(3).max(100).optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().allow('', null).optional(),
  city: Joi.string().allow('', null).optional(),
  address: Joi.string().min(5).max(500).allow('', null).optional(),
  locationUrl: Joi.string().uri().allow('', null).optional(),
  preferredLanguage: preferredLanguageField,
  userId: Joi.string().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(100).required().messages({
    'string.min': 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'
  })
});

module.exports = { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema };
