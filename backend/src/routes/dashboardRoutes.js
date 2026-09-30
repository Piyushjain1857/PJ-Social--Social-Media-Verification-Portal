const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { getUserDashboard, getAdminDashboard } = require('../controllers/dashboardController');

/**
 * Dashboard Routes - /api/dashboard
 *
 * All routes require a valid JWT (`authenticate`).
 */

// GET /api/dashboard/user
// Authenticated creators fetch their scoped user dashboard
router.get('/user', authenticate, authorize('USER', 'ADMIN', 'SUPER_ADMIN'), getUserDashboard);

// GET /api/dashboard/admin
// Protected: ADMIN and SUPER_ADMIN only
router.get('/admin', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAdminDashboard);

module.exports = router;
