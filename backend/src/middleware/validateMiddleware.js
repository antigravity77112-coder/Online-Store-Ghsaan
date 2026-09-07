const { ValidationError } = require('./errorMiddleware');

/**
 * Validates request data against a Joi schema.
 * @param {Object} schema - The Joi schema
 * @param {string} source - The property of req to validate ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    if (!req[source]) {
      return next(new ValidationError(`Missing request ${source}`));
    }

    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(errorMessage));
    }
    
    // Replace the request object with the validated and stripped value
    req[source] = value;
    next();
  };
};

module.exports = { validate };
