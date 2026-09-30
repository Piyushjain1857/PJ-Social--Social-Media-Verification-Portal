const { getAllUsers, updateUserRole, findUserById } = require('../repositories/userRepository');
const { getUserSubmissions, getAllSubmissions } = require('../repositories/submissionRepository');

/**
 * GET /api/users/profile
 * Protected: USER, ADMIN, SUPER_ADMIN
 * Retrieves authenticated user profile along with role-relevant summary metrics.
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    // Role-tailored summary stats for quick dashboard & profile consumption
    let stats = {};
    try {
      if (user.role === 'USER') {
        const mySubs = await getUserSubmissions(user.id);
        stats = {
          totalSubmissions: mySubs.length,
          approved: mySubs.filter(s => s.status === 'APPROVED').length,
          pending: mySubs.filter(s => s.status === 'PENDING').length,
          rejected: mySubs.filter(s => s.status === 'REJECTED').length
        };
      } else if (user.role === 'ADMIN') {
        const allSubs = await getAllSubmissions();
        stats = {
          pendingReview: allSubs.filter(s => s.status === 'PENDING').length,
          totalSubmissions: allSubs.length,
          approved: allSubs.filter(s => s.status === 'APPROVED').length
        };
      } else if (user.role === 'SUPER_ADMIN') {
        const allUsers = await getAllUsers();
        const allSubs = await getAllSubmissions();
        stats = {
          totalUsers: allUsers.length,
          totalAdmins: allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length,
          totalSubmissions: allSubs.length,
          pendingReview: allSubs.filter(s => s.status === 'PENDING').length
        };
      }
    } catch (e) {
      console.warn('[userController] Stats calculation error:', e.message);
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        stats
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users
 * Protected: ADMIN, SUPER_ADMIN
 * Retrieves the platform user directory.
 * USER role receives 403 Forbidden.
 */
const listUsers = async (req, res, next) => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/role
 * Protected: SUPER_ADMIN ONLY.
 * Strict RBAC: Admins CANNOT manage Super Admin privileges or elevate roles.
 */
const changeRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'USER'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    // Explicit check: Only SUPER_ADMIN can assign or manage roles
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Access denied. Only Super Administrators are authorized to modify user roles and permissions.',
        currentRole: req.user.role
      });
    }

    const targetUser = await findUserById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user was not found.'
      });
    }

    const updated = await updateUserRole(id, role);

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name} role successfully updated to ${role}.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  listUsers,
  changeRole
};

