const { getAllUsers, updateUserRole, findUserById } = require('../repositories/userRepository');

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
  listUsers,
  changeRole
};
