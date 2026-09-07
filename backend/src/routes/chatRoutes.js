const express = require('express');
const router = express.Router();
const { processChat } = require('../controllers/chatController');
const { chatLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/', chatLimiter, processChat);

module.exports = router;
