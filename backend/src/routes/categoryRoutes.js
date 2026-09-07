const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const categoryAttributeController = require('../controllers/categoryAttributeController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');
const { imageUpload } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { createCategorySchema, updateCategorySchema } = require('../validations/categoryValidation');

// Public routes — IMPORTANT: static paths must come before dynamic /:id
router.get('/', asyncHandler(categoryController.getCategories.bind(categoryController)));
router.get('/slug/:slug', asyncHandler(categoryController.getCategoryBySlug.bind(categoryController)));
router.get('/:id', asyncHandler(categoryController.getCategoryById.bind(categoryController)));
router.get('/:id/products', asyncHandler(categoryController.getProductsByCategory.bind(categoryController)));
// Public — attributes needed by seller product form
router.get('/:id/attributes', asyncHandler(categoryAttributeController.getAttributes));

// Admin-only mutating routes — static paths first
router.use(protect, authorize('Admin'));
router.post('/upload-icon', uploadLimiter, imageUpload.single('file'), asyncHandler(categoryController.uploadIcon.bind(categoryController)));
router.post('/', validate(createCategorySchema), asyncHandler(categoryController.createCategory.bind(categoryController)));
router.put('/:id', validate(updateCategorySchema), asyncHandler(categoryController.updateCategory.bind(categoryController)));
router.delete('/:id', asyncHandler(categoryController.deleteCategory.bind(categoryController)));
// Category Attribute CRUD — Admin only
// Note: reorder must come before /:attrId to avoid Express matching 'reorder' as attrId
router.put('/:id/attributes/reorder', asyncHandler(categoryAttributeController.reorderAttributes));
router.post('/:id/attributes', asyncHandler(categoryAttributeController.createAttribute));
router.put('/:id/attributes/:attrId', asyncHandler(categoryAttributeController.updateAttribute));
router.delete('/:id/attributes/:attrId', asyncHandler(categoryAttributeController.deleteAttribute));

module.exports = router;
