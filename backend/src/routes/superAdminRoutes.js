const express = require('express');
const router = express.Router();
const { getAuditLogs, getSystemStats } = require('../controllers/superAdminController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * SUPER_ADMIN Permission: Full system access
 * Strict RBAC: Both ADMIN and USER receive HTTP 403 Forbidden!
 */
router.get('/audit-logs', authenticate, authorize('SUPER_ADMIN'), getAuditLogs);
router.get('/system-stats', authenticate, authorize('SUPER_ADMIN'), getSystemStats);

module.exports = router;
