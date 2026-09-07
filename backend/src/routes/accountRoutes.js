const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } = require('../validations/accountValidation');

// Public routes
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(accountController.register.bind(accountController)));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(accountController.login.bind(accountController)));
router.post('/refresh', authLimiter, asyncHandler(accountController.refresh.bind(accountController)));
router.post('/logout', asyncHandler(accountController.logout.bind(accountController)));

// Protected routes (require authentication)
router.use(protect);

router.get('/profile', asyncHandler(accountController.getProfile.bind(accountController)));
router.put('/profile', validate(updateProfileSchema), asyncHandler(accountController.updateProfile.bind(accountController)));
router.put('/change-password', validate(changePasswordSchema), asyncHandler(accountController.changePassword.bind(accountController)));

module.exports = router;