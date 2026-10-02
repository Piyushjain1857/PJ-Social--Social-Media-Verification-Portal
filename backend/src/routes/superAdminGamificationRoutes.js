const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { requireSuperAdmin } = require('../middlewares/roleMiddleware');

const {
  getOverview,
  getUsers,
  getAdmins,
  getTransactions,
  getAnalytics,
  getSettings,
  updateSettings,
  adjustUserXP,
  getAuditLogs
} = require('../controllers/superAdminGamificationController');

/**
 * All Super Admin Gamification routes are strictly protected:
 * - Authentication required
 * - Role MUST be SUPER_ADMIN (Admin or User receives 403 Forbidden)
 */
router.use(authenticate);
router.use(requireSuperAdmin);

// 1. Overview Telemetry
router.get('/overview', getOverview);

// 2. All Users Gamification Directory
router.get('/users', getUsers);

// 3. All Admins Gamification Activity
router.get('/admins', getAdmins);

// 4. XP Transaction Explorer
router.get('/transactions', getTransactions);

// 5. Advanced Analytics
router.get('/analytics', getAnalytics);

// 6. Gamification Settings (Activity Points Configuration)
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// 7. Manual XP Adjustment
router.post('/users/:id/adjust-xp', adjustUserXP);

// 8. Gamification Audit Logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
