const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} = require('../validations/couponValidation');

// Public — read-only check (does not redeem)
router.post(
  '/validate',
  validate(validateCouponSchema),
  asyncHandler(couponController.validate.bind(couponController)),
);

// Admin
router.use(protect, authorize('Admin'));

router.get('/meta/generate-code', asyncHandler(couponController.generateCode.bind(couponController)));
router.get('/', asyncHandler(couponController.list.bind(couponController)));
router.get('/:id', asyncHandler(couponController.getOne.bind(couponController)));
router.post('/', validate(createCouponSchema), asyncHandler(couponController.create.bind(couponController)));
router.put('/:id', validate(updateCouponSchema), asyncHandler(couponController.update.bind(couponController)));
router.post('/:id/disable', asyncHandler(couponController.disable.bind(couponController)));

module.exports = router;
