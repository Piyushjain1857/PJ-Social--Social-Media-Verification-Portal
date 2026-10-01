const express = require('express');
const router = express.Router();
const {
  getMyPoints,
  getMyHistory,
  getMyRank,
  getLeaderboardList,
  getUserPointsById,
  getAdminOverviewView,
  getAllTransactionsAdmin,
  adjustUserPoints
} = require('../controllers/pointsController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

/**
 * Gamification Points & Transactions Routes (/api/points)
 */

// Creator / Authenticated user points summary, weekly/monthly stats, and level
router.get('/me', authenticate, getMyPoints);

// Creator / Authenticated user paginated points history
router.get('/me/history', authenticate, getMyHistory);

// Creator / Authenticated user current leaderboard rank
router.get('/me/rank', authenticate, getMyRank);

// Portal-wide leaderboard with timeframe filtering (all_time, this_month, this_week)
router.get('/leaderboard', authenticate, getLeaderboardList);

// Admin & Super Admin: Overview of creators' points, levels, and submission activity
router.get('/admin/overview', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAdminOverviewView);

// Super Admin only: Audit log of all platform point transactions
router.get('/all', authenticate, authorize('SUPER_ADMIN'), getAllTransactionsAdmin);

// Admin & Super Admin: Inspect any specific user's points & level
router.get('/user/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserPointsById);

// Super Admin only: Manual point balance adjustment with audit logging
router.post('/adjust', authenticate, authorize('SUPER_ADMIN'), adjustUserPoints);

module.exports = router;
