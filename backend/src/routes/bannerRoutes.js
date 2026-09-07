const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { imageUpload } = require('../middleware/uploadMiddleware');
const { uploadLimiter, bannerTrackLimiter } = require('../middleware/rateLimitMiddleware');
const {
  createBannerSchema,
  updateBannerSchema,
  trackBannerSchema,
  reorderBannersSchema,
} = require('../validations/bannerValidation');
const { idParamSchema } = require('../validations/commonValidation');

// ─── Public routes (no auth required — used by storefront) ─────────────────
router.get('/', asyncHandler(bannerController.getPublicBanners.bind(bannerController)));
router.post(
  '/:id/track',
  bannerTrackLimiter,
  validate(idParamSchema, 'params'),
  validate(trackBannerSchema),
  asyncHandler(bannerController.trackEvent.bind(bannerController))
);

// ─── Admin routes (must be Admin role) ────────────────────────────────────
router.use(protect, authorize('Admin'));

router.get('/admin', asyncHandler(bannerController.getAllBanners.bind(bannerController)));

router.post(
  '/admin/upload-image',
  uploadLimiter,
  imageUpload.single('file'),
  asyncHandler(bannerController.uploadImage.bind(bannerController))
);

// IMPORTANT: /admin/reorder must come BEFORE /admin/:id to avoid route collision
router.patch(
  '/admin/reorder',
  validate(reorderBannersSchema),
  asyncHandler(bannerController.reorderBanners.bind(bannerController))
);

router.post(
  '/admin',
  validate(createBannerSchema),
  asyncHandler(bannerController.createBanner.bind(bannerController))
);

router.put(
  '/admin/:id',
  validate(idParamSchema, 'params'),
  validate(updateBannerSchema),
  asyncHandler(bannerController.updateBanner.bind(bannerController))
);

router.delete(
  '/admin/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(bannerController.deleteBanner.bind(bannerController))
);

router.post(
  '/admin/:id/duplicate',
  validate(idParamSchema, 'params'),
  asyncHandler(bannerController.duplicateBanner.bind(bannerController))
);

router.patch(
  '/admin/:id/archive',
  validate(idParamSchema, 'params'),
  asyncHandler(bannerController.archiveBanner.bind(bannerController))
);

module.exports = router;
