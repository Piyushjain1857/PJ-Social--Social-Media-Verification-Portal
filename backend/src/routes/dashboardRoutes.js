const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { getUserDashboard } = require('../controllers/dashboardController');

/**
 * Dashboard Routes - /api/dashboard
 *
 * All routes require a valid JWT (`authenticate`).
 * USER dashboard is scoped strictly to the authenticated user via the JWT claim.
 */

// GET /api/dashboard/user
// Authenticated users (USER role only) fetch their own dashboard data.
// ADMIN and SUPER_ADMIN have separate dashboards (future).
router.get('/user', authenticate, authorize('USER', 'ADMIN', 'SUPER_ADMIN'), getUserDashboard);

module.exports = router;
