const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettingsController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public read
router.get('/exchange-rates', asyncHandler(systemSettingsController.getExchangeRates.bind(systemSettingsController)));
router.get('/store-info', asyncHandler(systemSettingsController.getStoreInfo.bind(systemSettingsController)));

// Protected routes (require Admin role)
router.put('/exchange-rates', protect, authorize('Admin'), asyncHandler(systemSettingsController.updateExchangeRates.bind(systemSettingsController)));
router.put('/store-info', protect, authorize('Admin'), asyncHandler(systemSettingsController.updateStoreInfo.bind(systemSettingsController)));

module.exports = router;
