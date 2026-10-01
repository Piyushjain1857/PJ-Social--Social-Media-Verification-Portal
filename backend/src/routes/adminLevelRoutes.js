const express = require('express');
const router = express.Router();
const {
  listLevels,
  getLevelConfiguration,
  createLevel,
  updateLevel,
  updateLevelStatus,
  deleteLevel,
  generateLevels
} = require('../controllers/adminLevelController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

/**
 * Super Admin Level Management Routes (/api/admin/levels)
 * Strict Server-Side RBAC: SUPER_ADMIN ONLY
 * Unauthorized requests (USER, ADMIN) return HTTP 403 Forbidden
 * Unauthenticated requests return HTTP 401 Unauthorized
 */

// Apply authentication and SUPER_ADMIN authorization to all level management routes
router.use(authenticate, authorize('SUPER_ADMIN'));

// Summary telemetry metrics (total, active, highest, xpToMax)
router.get('/configuration', getLevelConfiguration);

// List all levels (with dynamic cumulative thresholds)
router.get('/', listLevels);

// Bulk generate / reconfigure level series
router.post('/generate', generateLevels);

// Create single level
router.post('/', createLevel);

// Update level
router.put('/:id', updateLevel);

// Toggle active/inactive status
router.patch('/:id/status', updateLevelStatus);

// Safe level deletion (with warning & safe deactivation fallback)
router.delete('/:id', deleteLevel);

module.exports = router;
