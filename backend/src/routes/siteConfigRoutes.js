const express = require('express');
const router = express.Router();
const siteConfigController = require('../controllers/siteConfigController');
const asyncHandler = require('../middleware/asyncHandler');

/** Public runtime configuration */
router.get('/', asyncHandler(siteConfigController.getPublicConfig.bind(siteConfigController)));
router.get('/manifest.webmanifest', asyncHandler(siteConfigController.getWebManifest.bind(siteConfigController)));

module.exports = router;
