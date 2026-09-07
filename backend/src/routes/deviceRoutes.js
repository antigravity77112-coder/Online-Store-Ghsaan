const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/register', asyncHandler(deviceController.register.bind(deviceController)));
router.delete('/register', asyncHandler(deviceController.unregister.bind(deviceController)));
router.delete('/', asyncHandler(deviceController.unregisterAll.bind(deviceController)));

module.exports = router;
