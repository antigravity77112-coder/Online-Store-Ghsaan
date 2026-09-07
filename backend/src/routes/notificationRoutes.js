const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/preferences', asyncHandler(notificationController.getPreferences.bind(notificationController)));
router.patch('/preferences', asyncHandler(notificationController.updatePreferences.bind(notificationController)));
router.get('/unread-count', asyncHandler(notificationController.unreadCount.bind(notificationController)));
router.post('/read-all', asyncHandler(notificationController.markAllRead.bind(notificationController)));
router.post('/clear', asyncHandler(notificationController.clearAll.bind(notificationController)));
router.get('/', asyncHandler(notificationController.list.bind(notificationController)));
router.patch('/:id/read', asyncHandler(notificationController.markRead.bind(notificationController)));

module.exports = router;
