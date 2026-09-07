const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');
const { imageUpload } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { createBrandSchema, updateBrandSchema } = require('../validations/brandValidation');

// Public routes — static paths first
router.get('/', asyncHandler(brandController.getBrands.bind(brandController)));
router.get('/slug/:slug', asyncHandler(brandController.getBrandBySlug.bind(brandController)));
router.get('/:id', asyncHandler(brandController.getBrandById.bind(brandController)));
router.get('/:id/products', asyncHandler(brandController.getProductsByBrand.bind(brandController)));

// Admin-only mutating routes
router.use(protect, authorize('Admin'));
router.post('/upload-logo', uploadLimiter, imageUpload.single('file'), asyncHandler(brandController.uploadLogo.bind(brandController)));
router.post('/', validate(createBrandSchema), asyncHandler(brandController.createBrand.bind(brandController)));
router.put('/:id', validate(updateBrandSchema), asyncHandler(brandController.updateBrand.bind(brandController)));
router.delete('/:id', asyncHandler(brandController.deleteBrand.bind(brandController)));

module.exports = router;
