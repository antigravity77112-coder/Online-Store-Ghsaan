/**
 * Recursively sanitizes strings to prevent XSS.
 * Converts <, >, &, ', " into HTML entities.
 */
const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
  );
};

const sanitize = (obj) => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return escapeHtml(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item));
  }

  const sanitizedObj = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitizedObj[key] = sanitize(value);
  }
  return sanitizedObj;
};

// Express Middleware
const sanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
};

module.exports = { sanitize, sanitizeMiddleware };
