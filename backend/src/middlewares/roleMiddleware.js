/**
 * Reusable Role-Based Authorization Middleware
 *
 * Enforces 3-tier role governance:
 *   - SUPER_ADMIN : Full system access, platform governance, role assignment.
 *   - ADMIN       : Review submissions, view user directory, moderation queue.
 *                   CANNOT manage Super Admin privileges.
 *   - USER        : Create submissions, view own submissions, view own profile & notifications.
 */

// Centralized Role Enum matching Prisma schema
const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
});

// Centralized Permissions Definition
const PERMISSIONS = Object.freeze({
  // Super Admin exclusive
  FULL_SYSTEM_ACCESS: [ROLES.SUPER_ADMIN],
  MANAGE_ROLES: [ROLES.SUPER_ADMIN],
  VIEW_AUDIT_LOGS: [ROLES.SUPER_ADMIN],
  SYSTEM_CONFIG: [ROLES.SUPER_ADMIN],

  // Admin & Super Admin shared
  REVIEW_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  VIEW_ALL_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  VIEW_USERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // User, Admin & Super Admin accessible
  CREATE_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER],
  VIEW_OWN_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER],
  VIEW_OWN_PROFILE: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER],
  VIEW_OWN_NOTIFICATIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER],
});

/**
 * Reusable role authorization middleware factory.
 * Accepts one or more role strings, or an array of roles.
 *
 * Example usage:
 *   router.get('/queue', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getQueue);
 *   router.get('/admin', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), handler);
 *   router.get('/system', authenticate, authorize('SUPER_ADMIN'), getSystem);
 */
const authorize = (...roles) => {
  // Flatten in case an array was passed as a single argument
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    // Ensure authentication middleware ran first
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No valid user session found.'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. You do not have permission to access this resource.'
      });
    }

    next();
  };
};

/**
 * Reusable permission authorization middleware factory.
 * Example usage:
 *   router.get('/users', authenticate, requirePermission('VIEW_USERS'), listUsers);
 */
const requirePermission = (permissionKey) => {
  const allowedRoles = PERMISSIONS[permissionKey];
  if (!allowedRoles) {
    throw new Error(`Unknown permission key: ${permissionKey}`);
  }
  return authorize(allowedRoles);
};

/**
 * Specific middleware ensuring that ADMIN cannot manage Super Admin privileges.
 * Enforces:
 *   - Only SUPER_ADMIN can modify, assign, or touch SUPER_ADMIN privileges.
 *   - ADMIN cannot elevate any user to SUPER_ADMIN.
 *   - ADMIN cannot demote, modify or delete any user whose current role is SUPER_ADMIN.
 */
const preventSuperAdminPrivilegeEscalation = (req, res, next) => {
  const callerRole = req.user?.role;
  const requestedRole = req.body?.role;

  // If someone is trying to promote to SUPER_ADMIN, caller MUST be SUPER_ADMIN
  if (requestedRole === ROLES.SUPER_ADMIN && callerRole !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SUPER_ADMIN_MANAGEMENT_RESTRICTED',
      message: 'Admins cannot manage Super Admin privileges or elevate accounts to Super Admin.',
      currentRole: callerRole
    });
  }

  next();
};

/**
 * Convenience helper middlewares
 */
const requireSuperAdmin = authorize(ROLES.SUPER_ADMIN);
const requireAdminOrAbove = authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN);
const requireAuthenticatedUser = authorize(ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN);

/**
 * Resource ownership authorization middleware.
 * - Allows SUPER_ADMIN and ADMIN access to all resources.
 * - Allows normal USER only when their authenticated user ID matches the target resource ID.
 * - Otherwise returns 403 Forbidden.
 */
const requireOwnerOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No valid user session found.'
      });
    }

    const { role, id: authenticatedUserId } = req.user;

    if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
      return next();
    }

    const targetResourceId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (targetResourceId && String(targetResourceId) === String(authenticatedUserId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'FORBIDDEN',
      message: 'Access denied. You do not have permission to view or modify another user\'s data.'
    });
  };
};

module.exports = {
  ROLES,
  PERMISSIONS,
  authorize,
  requirePermission,
  preventSuperAdminPrivilegeEscalation,
  requireSuperAdmin,
  requireAdminOrAbove,
  requireAuthenticatedUser,
  requireOwnerOrAdmin,
};
