const express = require('express');
const router = express.Router();
const {
  getMyGamification,
  getMyXPChart,
  getMyRankMetrics,
  getMyRankHistory,
  getMyXPHistory,
  getLevelsList,
  getMyLevelJourney,
  getMyActivityDistribution,
  getUserGamificationById,
  getUserXPChartById,
  getUserRankMetricsById,
  getUserRankHistoryById,
  getUserLevelJourneyById,
  getUserActivityDistributionById
} = require('../controllers/gamificationController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

/**
 * Gamification Routes (/api/gamification)
 */

// Authenticated user gamification profile (XP, level, progress, rank, thresholds)
router.get('/me', authenticate, getMyGamification);

// Authenticated user XP progression chart over time
router.get('/me/chart', authenticate, getMyXPChart);

// Authenticated user activity distribution breakdown
router.get('/me/activity-distribution', authenticate, getMyActivityDistribution);

// Authenticated user real ranking & percentile metrics
router.get('/me/rank', authenticate, getMyRankMetrics);

// Authenticated user monthly position / rank timeline
router.get('/me/rank-history', authenticate, getMyRankHistory);

// Authenticated user paginated XP transaction history
router.get('/me/history', authenticate, getMyXPHistory);

// Authenticated user's full level journey (all levels with status)
router.get('/me/journey', authenticate, getMyLevelJourney);

// Active dynamic level configurations
router.get('/levels', authenticate, getLevelsList);

// Leaderboard endpoint on /api/gamification/leaderboard
const { getLeaderboardList } = require('../controllers/pointsController');
router.get('/leaderboard', authenticate, getLeaderboardList);

// Admin / Super Admin inspect user's XP & level
router.get('/user/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserGamificationById);
router.get('/user/:id/chart', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserXPChartById);
router.get('/user/:id/rank', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserRankMetricsById);
router.get('/user/:id/rank-history', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserRankHistoryById);
router.get('/user/:id/journey', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserLevelJourneyById);
router.get('/user/:id/activity-distribution', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserActivityDistributionById);

module.exports = router;
