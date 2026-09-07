const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { createOrderSchema } = require('../validations/orderValidation');
const { updateOrderStatusSchema } = require('../validations/adminValidation');
const { idParamSchema } = require('../validations/commonValidation');

// All order routes require authentication
router.use(protect);

router.post('/', validate(createOrderSchema), asyncHandler(orderController.createOrder.bind(orderController)));
router.get('/my-orders', asyncHandler(orderController.getMyOrders.bind(orderController)));
router.get('/track/:code', asyncHandler(orderController.trackMyOrder.bind(orderController)));
router.patch('/:id/status', authorize('Admin'), validate(idParamSchema, 'params'), validate(updateOrderStatusSchema), asyncHandler(orderController.updateOrderStatus.bind(orderController)));

module.exports = router;