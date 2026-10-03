const express = require('express');
const router = express.Router();
const {
  postTestEmail,
  listEmailLogs,
  getEmailStatus,
  listEmailTemplates
} = require('../controllers/superAdminEmailController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * Super Admin Protected Email Management Endpoints
 * Strict RBAC: Only SUPER_ADMIN allowed. Unauthorized users receive 401/403.
 */

router.post('/test', authenticate, authorize('SUPER_ADMIN'), postTestEmail);
router.get('/logs', authenticate, authorize('SUPER_ADMIN'), listEmailLogs);
router.get('/status', authenticate, authorize('SUPER_ADMIN'), getEmailStatus);
router.get('/templates', authenticate, authorize('SUPER_ADMIN'), listEmailTemplates);

module.exports = router;
