// Vercel serverless entry point
// Re-exports the Express app for Vercel's auto-detection
const app = require('../server.js');

module.exports = app;
