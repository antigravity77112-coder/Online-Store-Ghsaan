/**
 * Wrapper for async express routes to catch errors and pass them to error middleware
 * @param {Function} fn - The async route handler function
 * @returns {Function} Express route handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
