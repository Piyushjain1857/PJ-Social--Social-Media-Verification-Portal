const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { requireAdminOrAbove } = require('../middlewares/roleMiddleware');
const {
  getUsersList,
  getUserDetails,
  getAnalytics,
  postAdjustXP,
  getUserHistory
} = require('../controllers/adminGamificationController');

// All routes require Authentication and ADMIN or SUPER_ADMIN role
router.use(authenticate, requireAdminOrAbove);

// GET /api/admin/gamification/analytics - High level telemetry & distribution
router.get('/analytics', getAnalytics);

// GET /api/admin/gamification/users - Paginated, searchable, filterable creator list
router.get('/users', getUsersList);

// GET /api/admin/gamification/users/:id - Comprehensive gamification dossier
router.get('/users/:id', getUserDetails);

// POST /api/admin/gamification/users/:id/adjust-xp - Admin manual XP adjustment
router.post('/users/:id/adjust-xp', postAdjustXP);

// GET /api/admin/gamification/users/:id/history - User XP transaction history
router.get('/users/:id/history', getUserHistory);

module.exports = router;
