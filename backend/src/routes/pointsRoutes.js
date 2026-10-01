const express = require('express');
const router = express.Router();
const {
  getMyPoints,
  getMyHistory,
  getUserPointsById,
  adjustUserPoints
} = require('../controllers/pointsController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

/**
 * Gamification Points & Transactions Routes
 */

// Creator / Authenticated user points summary & breakdown
router.get('/me', authenticate, getMyPoints);

// Creator / Authenticated user paginated points history
router.get('/me/history', authenticate, getMyHistory);

// Admin & Super Admin: Inspect any user's points
router.get('/user/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserPointsById);

// Super Admin only: Manual point balance adjustment with audit logging
router.post('/adjust', authenticate, authorize('SUPER_ADMIN'), adjustUserPoints);

module.exports = router;
