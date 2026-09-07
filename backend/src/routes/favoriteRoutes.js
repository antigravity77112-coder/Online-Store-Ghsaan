const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// All favorite routes require authentication
router.use(protect);

router.get('/', asyncHandler(favoritesController.getFavorites.bind(favoritesController)));
router.post('/', asyncHandler(favoritesController.addFavorite.bind(favoritesController)));
router.post('/sync', asyncHandler(favoritesController.syncFavorites.bind(favoritesController)));
router.delete('/:productId', asyncHandler(favoritesController.removeFavorite.bind(favoritesController)));

module.exports = router;
