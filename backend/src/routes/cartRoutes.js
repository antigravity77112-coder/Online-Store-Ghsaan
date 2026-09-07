const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(protect);

router.get('/', asyncHandler(cartController.getCart.bind(cartController)));
router.post('/', asyncHandler(cartController.addToCart.bind(cartController)));
router.post('/sync', asyncHandler(cartController.syncCart.bind(cartController)));
router.put('/:productId', asyncHandler(cartController.updateCartItem.bind(cartController)));
router.delete('/', asyncHandler(cartController.clearCart.bind(cartController)));
router.delete('/:productId', asyncHandler(cartController.removeFromCart.bind(cartController)));

module.exports = router;
