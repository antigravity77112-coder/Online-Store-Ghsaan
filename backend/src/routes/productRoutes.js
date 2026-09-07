const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const { imageUpload } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const { idParamSchema } = require('../validations/commonValidation');

// Public routes
router.get('/', asyncHandler(productController.getProducts.bind(productController)));

// Protected routes (require authentication)
router.post('/', protect, authorize('Admin'), validate(createProductSchema), asyncHandler(productController.createProduct.bind(productController)));
router.post('/upload-image', protect, authorize('Admin'), uploadLimiter, imageUpload.single('file'), asyncHandler(productController.uploadImage.bind(productController)));

// SEO slug route — MUST come before :id wildcard
router.get('/by-slug/:slug', optionalProtect, asyncHandler(productController.getProductBySlug.bind(productController)));

// :id wildcard MUST come AFTER literal routes like /my-products
router.get('/:id', optionalProtect, validate(idParamSchema, 'params'), asyncHandler(productController.getProductById.bind(productController)));
router.put('/:id', protect, authorize('Admin'), validate(idParamSchema, 'params'), validate(updateProductSchema), asyncHandler(productController.updateProduct.bind(productController)));
router.delete('/:id', protect, authorize('Admin'), validate(idParamSchema, 'params'), asyncHandler(productController.deleteProduct.bind(productController)));
router.patch('/:id/toggle-visibility', protect, authorize('Admin'), validate(idParamSchema, 'params'), asyncHandler(productController.toggleVisibility.bind(productController)));

// Product image gallery management
router.get('/:id/images', asyncHandler(productController.getProductImages.bind(productController)));
router.post('/:id/images', protect, authorize('Admin'), asyncHandler(productController.addProductImage.bind(productController)));
router.put('/:id/images/reorder', protect, authorize('Admin'), asyncHandler(productController.reorderImages.bind(productController)));
router.patch('/:id/images/:imageId/primary', protect, authorize('Admin'), asyncHandler(productController.setImagePrimary.bind(productController)));
router.delete('/:id/images/:imageId', protect, authorize('Admin'), asyncHandler(productController.deleteProductImage.bind(productController)));

module.exports = router;
