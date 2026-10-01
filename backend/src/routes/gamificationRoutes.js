const express = require('express');
const router = express.Router();
const {
  getMyGamification,
  getMyXPHistory,
  getLevelsList,
  getMyLevelJourney,
  getUserGamificationById
} = require('../controllers/gamificationController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

/**
 * Gamification Routes (/api/gamification)
 */

// Authenticated user gamification profile (XP, level, progress, thresholds)
router.get('/me', authenticate, getMyGamification);

// Authenticated user paginated XP transaction history
router.get('/me/history', authenticate, getMyXPHistory);

// Authenticated user's full level journey (all levels with status)
router.get('/me/journey', authenticate, getMyLevelJourney);

// Active dynamic level configurations
router.get('/levels', authenticate, getLevelsList);

// Admin / Super Admin inspect user's XP & level
router.get('/user/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserGamificationById);

module.exports = router;
