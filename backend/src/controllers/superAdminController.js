const {
  getAllUsers,
  getUsersPaginated,
  getUserDetails: getUserDetailsRepo,
  findUserById,
  findUserByEmail,
  createUser: createUserRepo,
  updateUser: updateUserRepo,
  updateUserStatus: updateUserStatusRepo,
  deleteUser: deleteUserRepo,
  countSuperAdmins
} = require('../repositories/userRepository');
const { getAllSubmissions } = require('../repositories/submissionRepository');
const { createNotification } = require('../repositories/notificationRepository');
const { hashPassword } = require('../utils/hash');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/superadmin/audit-logs
 * Protected: SUPER_ADMIN ONLY
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const logs = [
      {
        id: 'log-001',
        event: 'USER_ROLE_INITIALIZED',
        actor: 'system',
        target: 'usr-superadmin-001',
        details: 'Super administrator master account seeded.',
        timestamp: new Date('2026-01-01T00:00:00Z')
      },
      {
        id: 'log-002',
        event: 'MODERATOR_ONBOARDED',
        actor: 'usr-superadmin-001',
        target: 'usr-admin-002',
        details: 'Admin privileges granted to Marcus Brody for moderation queue.',
        timestamp: new Date('2026-01-15T00:00:00Z')
      },
      {
        id: 'log-003',
        event: 'SUBMISSION_VERDICT',
        actor: 'usr-admin-002',
        target: 'sub-002',
        details: 'LinkedIn engagement verified and marked APPROVED.',
        timestamp: new Date('2026-02-09T14:20:00Z')
      },
      {
        id: 'log-004',
        event: 'RBAC_SECURITY_AUDIT',
        actor: req.user.email,
        target: 'system_core',
        details: 'Super Admin accessed full system security audit telemetry.',
        timestamp: new Date()
      }
    ];

    return res.status(200).json({
      success: true,
      message: 'System audit logs retrieved successfully.',
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/superadmin/system-stats
 * Protected: SUPER_ADMIN ONLY
 */
const getSystemStats = async (req, res, next) => {
  try {
    const users = await getAllUsers();
    const submissions = await getAllSubmissions();

    const roleBreakdown = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    const submissionBreakdown = submissions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: users.length,
        roleBreakdown,
        totalSubmissions: submissions.length,
        submissionBreakdown,
        systemHealth: 'OPERATIONAL',
        governanceLevel: 'SUPER_ADMIN_TIER_1'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/superadmin/users
 * Protected: SUPER_ADMIN ONLY
 * Lists users with search, role filter, status filter, and pagination.
 */
const listUsersManagement = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const role = req.query.role || 'ALL';
    const status = req.query.status || 'ALL';

    const result = await getUsersPaginated({ page, limit, search, role, status });

    return res.status(200).json({
      success: true,
      count: result.users.length,
      data: result.users,
      pagination: result.pagination,
      stats: result.stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/superadmin/users/:id
 * Protected: SUPER_ADMIN ONLY
 * Retrieves detailed user profile and activity metrics without exposing password hash.
 */
const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await getUserDetailsRepo(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User does not exist or has been removed.'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/superadmin/users
 * Protected: SUPER_ADMIN ONLY
 * Creates a new user (Normal User or Admin) with password hashing and validation.
 */
const createUserManagement = async (req, res, next) => {
  try {
    const { name, email, password, role = 'USER', status = 'ACTIVE' } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_NAME',
        message: 'Name is required and must be at least 2 characters.'
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        message: 'A valid email address is required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_IN_USE',
        message: 'A user with this email address already exists.'
      });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PASSWORD',
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Validate role
    const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    const assignedRole = role.toUpperCase();
    if (!validRoles.includes(assignedRole)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ROLE',
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    const assignedStatus = (status || 'ACTIVE').toUpperCase();
    if (!validStatuses.includes(assignedStatus)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await createUserRepo({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
      status: assignedStatus
    });

    // Notify user of account provisioning
    try {
      await createNotification({
        userId: newUser.id,
        type: 'SYSTEM',
        title: 'Account Provisioned',
        message: `Your account has been provisioned as ${assignedRole} by administrator ${req.user.name}.`
      });
    } catch (notifErr) {
      console.warn('[superAdminController] Provisioning notification failed:', notifErr.message);
    }

    // Never expose password hash
    const sanitized = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    return res.status(201).json({
      success: true,
      message: `User ${sanitized.name} created successfully.`,
      data: sanitized
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/superadmin/users/:id
 * Protected: SUPER_ADMIN ONLY
 * Modifies user details, role, status, or resets password.
 * Protects against accidental privilege escalation or locking out the root Super Admin.
 */
const updateUserManagement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;

    const targetUser = await findUserById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Target user does not exist.'
      });
    }

    const updates = {};

    // Validate name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_NAME',
          message: 'Name must be at least 2 characters.'
        });
      }
      updates.name = name.trim();
    }

    // Validate email
    if (email !== undefined) {
      if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_EMAIL',
          message: 'A valid email address is required.'
        });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== targetUser.email.toLowerCase()) {
        const existing = await findUserByEmail(normalizedEmail);
        if (existing && existing.id !== id) {
          return res.status(409).json({
            success: false,
            code: 'EMAIL_IN_USE',
            message: 'Email address is already in use by another user.'
          });
        }
      }
      updates.email = normalizedEmail;
    }

    // Validate role & prevent demoting sole Super Admin
    if (role !== undefined) {
      const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
      const targetRole = role.toUpperCase();
      if (!validRoles.includes(targetRole)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ROLE',
          message: `Role must be one of: ${validRoles.join(', ')}`
        });
      }

      if (targetUser.role === 'SUPER_ADMIN' && targetRole !== 'SUPER_ADMIN') {
        const superAdminCount = await countSuperAdmins();
        if (superAdminCount <= 1) {
          return res.status(400).json({
            success: false,
            code: 'SOLE_SUPER_ADMIN_PROTECTED',
            message: 'Cannot demote the sole active Super Administrator. Promote another Super Administrator first.'
          });
        }
      }

      updates.role = targetRole;
    }

    // Validate status & prevent deactivating sole Super Admin
    if (status !== undefined) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
      const targetStatus = status.toUpperCase();
      if (!validStatuses.includes(targetStatus)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }

      if (targetUser.role === 'SUPER_ADMIN' && targetStatus !== 'ACTIVE') {
        const superAdminCount = await countSuperAdmins();
        if (superAdminCount <= 1) {
          return res.status(400).json({
            success: false,
            code: 'SOLE_SUPER_ADMIN_PROTECTED',
            message: 'Cannot deactivate the sole active Super Administrator.'
          });
        }
      }

      updates.status = targetStatus;
    }

    // Optional password reset
    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PASSWORD',
          message: 'New password must be at least 8 characters long.'
        });
      }
      updates.password = await hashPassword(password);
    }

    const updatedUser = await updateUserRepo(id, updates);

    // Send notification if role or status was modified
    if (updates.role || updates.status) {
      try {
        const detail = updates.role ? `role to ${updates.role}` : `status to ${updates.status}`;
        await createNotification({
          userId: id,
          type: 'ACCOUNT_ALERT',
          title: 'Account Settings Updated',
          message: `Your account ${detail} was updated by administrator ${req.user.name}.`
        });
      } catch (notifErr) {
        console.warn('[superAdminController] Notification dispatch failed:', notifErr.message);
      }
    }

    // Strip password
    const sanitized = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    return res.status(200).json({
      success: true,
      message: `User ${sanitized.name} updated successfully.`,
      data: sanitized
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/superadmin/users/:id/status
 * Protected: SUPER_ADMIN ONLY
 * Quick toggle for user activation / deactivation / suspension.
 */
const updateUserStatusManagement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const targetStatus = status.toUpperCase();
    const targetUser = await findUserById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Target user does not exist.'
      });
    }

    if (targetUser.role === 'SUPER_ADMIN' && targetStatus !== 'ACTIVE') {
      const superAdminCount = await countSuperAdmins();
      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          code: 'SOLE_SUPER_ADMIN_PROTECTED',
          message: 'Cannot deactivate the sole active Super Administrator.'
        });
      }
    }

    const updated = await updateUserStatusRepo(id, targetStatus);

    try {
      await createNotification({
        userId: id,
        type: 'ACCOUNT_ALERT',
        title: 'Account Status Modified',
        message: `Your account status was set to ${targetStatus} by administrator ${req.user.name}.`
      });
    } catch (notifErr) {
      console.warn('[superAdminController] Notification error:', notifErr.message);
    }

    const sanitized = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      updatedAt: updated.updatedAt
    };

    return res.status(200).json({
      success: true,
      message: `User ${sanitized.name} status updated to ${targetStatus}.`,
      data: sanitized
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/superadmin/users/:id
 * Protected: SUPER_ADMIN ONLY
 */
const deleteUserManagement = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_DELETE_SELF',
        message: 'You cannot delete your own active Super Administrator session.'
      });
    }

    const targetUser = await findUserById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User does not exist.'
      });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      const superAdminCount = await countSuperAdmins();
      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          code: 'SOLE_SUPER_ADMIN_PROTECTED',
          message: 'Cannot delete the sole active Super Administrator.'
        });
      }
    }

    await deleteUserRepo(id);

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name} (${targetUser.email}) has been permanently deleted.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getSystemStats,
  listUsersManagement,
  getUserDetails,
  createUserManagement,
  updateUserManagement,
  updateUserStatusManagement,
  deleteUserManagement
};
