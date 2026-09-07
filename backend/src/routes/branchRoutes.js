const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── Public — storefront can read active branches ───────────────────────────
router.get('/', asyncHandler(branchController.getAll.bind(branchController)));
router.get('/:id', asyncHandler(branchController.getOne.bind(branchController)));

// ─── Admin only ──────────────────────────────────────────────────────────────
router.use(protect, authorize('Admin'));

router.post('/', asyncHandler(branchController.create.bind(branchController)));
router.put('/:id', asyncHandler(branchController.update.bind(branchController)));
router.delete('/:id', asyncHandler(branchController.remove.bind(branchController)));

module.exports = router;
