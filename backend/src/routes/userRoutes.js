const express = require('express');
const router = express.Router();
const {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changeUserPassword,
  changeUserEmail,
  listUsers,
  getUserDetails,
  changeRole,
  getUserProfile
} = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize, preventSuperAdminPrivilegeEscalation } = require('../middlewares/roleMiddleware');

/**
 * Authenticated User Profile APIs:
 * Reusable profile management endpoints accessible by any verified authenticated role (USER, ADMIN, SUPER_ADMIN).
 */
router.get('/me', authenticate, getCurrentUserProfile);
router.put('/me', authenticate, updateCurrentUserProfile);
router.put('/change-password', authenticate, changeUserPassword);
router.put('/change-email', authenticate, changeUserEmail);

// Legacy profile endpoint for backward compatibility
router.get('/profile', authenticate, getUserProfile);

/**
 * ADMIN & SUPER_ADMIN Permission: View relevant users and submission information
 * Strict RBAC: USER receives HTTP 403 Forbidden!
 */
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), listUsers);

/**
 * ADMIN & SUPER_ADMIN Permission: View user details dossier
 */
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getUserDetails);

/**
 * SUPER_ADMIN Permission: Manage user roles and system privileges
 * Strict RBAC:
 *   - Only SUPER_ADMIN can alter user roles.
 *   - ADMIN CANNOT manage Super Admin privileges.
 */
router.patch(
  '/:id/role',
  authenticate,
  authorize('SUPER_ADMIN'),
  preventSuperAdminPrivilegeEscalation,
  changeRole
);

module.exports = router;
