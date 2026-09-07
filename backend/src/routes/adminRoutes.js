const express = require('express');
const router = express.Router();
const { backupUpload, imageUpload } = require('../middleware/uploadMiddleware');
const adminController = require('../controllers/adminController');
const siteConfigController = require('../controllers/siteConfigController');
const orderController = require('../controllers/orderController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { changeRoleSchema, updateOrderStatusSchema } = require('../validations/adminValidation');
const { idParamSchema } = require('../validations/commonValidation');
const { siteConfigUpdateSchema, uploadAssetSchema } = require('../validations/siteConfigValidation');

// All admin routes require authentication and Admin role
router.use(protect, authorize('Admin'));

// Site customization
router.get('/config', asyncHandler(siteConfigController.getAdminConfig.bind(siteConfigController)));
router.put('/config', validate(siteConfigUpdateSchema), asyncHandler(siteConfigController.updateConfig.bind(siteConfigController)));
router.post('/config/upload-asset', imageUpload.single('file'), asyncHandler(siteConfigController.uploadAsset.bind(siteConfigController)));

router.get('/dashboard', asyncHandler(adminController.getDashboardStats.bind(adminController)));
router.get('/users', asyncHandler(adminController.getAllUsers.bind(adminController)));
router.patch('/users/:id/block', validate(idParamSchema, 'params'), asyncHandler(adminController.blockUser.bind(adminController)));
router.patch('/users/:id/role', validate(idParamSchema, 'params'), validate(changeRoleSchema), asyncHandler(adminController.changeUserRole.bind(adminController)));
router.delete('/users/:id', validate(idParamSchema, 'params'), asyncHandler(adminController.deleteUser.bind(adminController)));
router.get('/products/stats', asyncHandler(adminController.getProductStats.bind(adminController)));
router.get('/products', asyncHandler(adminController.getAllProducts.bind(adminController)));
router.patch('/products/bulk-status', asyncHandler(adminController.bulkUpdateProductStatus.bind(adminController)));
router.patch('/products/bulk-category', asyncHandler(adminController.bulkUpdateProductCategory.bind(adminController)));
router.delete('/products/bulk-delete', asyncHandler(adminController.bulkDeleteProducts.bind(adminController)));
router.delete('/products/:id', validate(idParamSchema, 'params'), asyncHandler(adminController.deleteProduct.bind(adminController)));

// Database Backup & Restore
router.get('/backup', asyncHandler(adminController.downloadBackup.bind(adminController)));
router.post('/restore', backupUpload.single('backupFile'), asyncHandler(adminController.restoreBackup.bind(adminController)));

// Order management
router.get('/orders', asyncHandler(orderController.getAllOrders.bind(orderController)));
router.patch('/orders/:id/status', validate(idParamSchema, 'params'), validate(updateOrderStatusSchema), asyncHandler(orderController.updateOrderStatus.bind(orderController)));
router.post('/orders/:id/notify', validate(idParamSchema, 'params'), asyncHandler(orderController.resendOrderNotification.bind(orderController)));

// Notifications
const notificationController = require('../controllers/notificationController');
router.get('/notifications/campaigns', asyncHandler(notificationController.adminCampaigns.bind(notificationController)));
router.get('/notifications', asyncHandler(notificationController.adminList.bind(notificationController)));
router.post('/notifications/broadcast', asyncHandler(notificationController.adminBroadcast.bind(notificationController)));

module.exports = router;
