const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  getSystemStats,
  listUsersManagement,
  getUserDetails,
  createUserManagement,
  updateUserManagement,
  updateUserStatusManagement,
  deleteUserManagement
} = require('../controllers/superAdminController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * SUPER_ADMIN Permission: Full system governance & User Management
 * Strict RBAC: Both ADMIN and USER receive HTTP 403 Forbidden!
 */

// Telemetry & Logs
router.get('/audit-logs', authenticate, authorize('SUPER_ADMIN'), getAuditLogs);
router.get('/system-stats', authenticate, authorize('SUPER_ADMIN'), getSystemStats);

// User Management CRUD APIs (Only SUPER_ADMIN)
router.get('/users', authenticate, authorize('SUPER_ADMIN'), listUsersManagement);
router.get('/users/:id', authenticate, authorize('SUPER_ADMIN'), getUserDetails);
router.post('/users', authenticate, authorize('SUPER_ADMIN'), createUserManagement);
router.patch('/users/:id', authenticate, authorize('SUPER_ADMIN'), updateUserManagement);
router.patch('/users/:id/status', authenticate, authorize('SUPER_ADMIN'), updateUserStatusManagement);
router.delete('/users/:id', authenticate, authorize('SUPER_ADMIN'), deleteUserManagement);

module.exports = router;
