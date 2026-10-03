const express = require('express');
const router = express.Router();
const {
  postTestEmail,
  listEmailLogs,
  getEmailLogDetails,
  getOverviewMetrics,
  getEmailAnalyticsEndpoint,
  getFailedEmails,
  postRetryEmail,
  getEmailSettings,
  updateEventToggles,
  getTemplateConfigsEndpoint,
  updateTemplateConfigEndpoint,
  getEmailStatus,
  listEmailTemplates
} = require('../controllers/superAdminEmailController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * Super Admin Protected Email Management Endpoints
 * Strict RBAC: Only SUPER_ADMIN allowed. Unauthorized users receive 401/403.
 */

// Overview & Analytics
router.get('/overview', authenticate, authorize('SUPER_ADMIN'), getOverviewMetrics);
router.get('/analytics', authenticate, authorize('SUPER_ADMIN'), getEmailAnalyticsEndpoint);

// Logs & Details
router.get('/logs', authenticate, authorize('SUPER_ADMIN'), listEmailLogs);
router.get('/logs/:id', authenticate, authorize('SUPER_ADMIN'), getEmailLogDetails);

// Failed Emails & Retry
router.get('/failed', authenticate, authorize('SUPER_ADMIN'), getFailedEmails);
router.post('/retry/:id', authenticate, authorize('SUPER_ADMIN'), postRetryEmail);

// Configuration & Event Toggles
router.get('/settings', authenticate, authorize('SUPER_ADMIN'), getEmailSettings);
router.put('/settings/events', authenticate, authorize('SUPER_ADMIN'), updateEventToggles);

// Template Management
router.get('/templates/config', authenticate, authorize('SUPER_ADMIN'), getTemplateConfigsEndpoint);
router.put('/templates/config/:key', authenticate, authorize('SUPER_ADMIN'), updateTemplateConfigEndpoint);
router.get('/templates', authenticate, authorize('SUPER_ADMIN'), listEmailTemplates);

// Test Email Dispatch
router.post('/test', authenticate, authorize('SUPER_ADMIN'), postTestEmail);

// Legacy/Compatibility Status
router.get('/status', authenticate, authorize('SUPER_ADMIN'), getEmailStatus);

module.exports = router;
