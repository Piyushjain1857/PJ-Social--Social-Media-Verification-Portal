const express = require('express');
const router = express.Router();
const { serveScreenshot } = require('../controllers/uploadController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

/**
 * GET /api/uploads/screenshots/:filename
 * Auth-gated screenshot serve endpoint.
 * - USER: own submissions only (enforced inside controller)
 * - ADMIN / SUPER_ADMIN: any screenshot
 *
 * Filenames are validated in resolveScreenshotPath — path traversal is not possible.
 */
router.get(
  '/screenshots/:filename',
  authenticate,
  authorize('USER', 'ADMIN', 'SUPER_ADMIN'),
  serveScreenshot
);

module.exports = router;
