const express = require('express');
const router = express.Router();
const scentController = require('../controllers/scentController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');
const { imageUpload } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { createScentSchema, updateScentSchema } = require('../validations/scentValidation');

// Public routes — static paths first (optional auth for admin includeInactive)
router.get('/', optionalProtect, asyncHandler(scentController.getScents.bind(scentController)));
router.get('/slug/:slug', optionalProtect, asyncHandler(scentController.getScentBySlug.bind(scentController)));
router.get('/:id/products', asyncHandler(scentController.getProductsByScent.bind(scentController)));
router.get('/:id', optionalProtect, asyncHandler(scentController.getScentById.bind(scentController)));

// Admin-only mutating routes
router.use(protect, authorize('Admin'));
router.post('/upload-image', uploadLimiter, imageUpload.single('file'), asyncHandler(scentController.uploadImage.bind(scentController)));
router.post('/', validate(createScentSchema), asyncHandler(scentController.createScent.bind(scentController)));
router.put('/:id', validate(updateScentSchema), asyncHandler(scentController.updateScent.bind(scentController)));
router.patch('/:id/toggle-active', asyncHandler(scentController.toggleActive.bind(scentController)));
router.delete('/:id', asyncHandler(scentController.deleteScent.bind(scentController)));

module.exports = router;
