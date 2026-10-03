const { getAllUsers, getUsersPaginated, updateUserRole, findUserById, findUserByEmail, updateUser, getUserDetails: getUserDetailsRepo } = require('../repositories/userRepository');
const { getUserSubmissions, getAllSubmissions } = require('../repositories/submissionRepository');
const { createNotification } = require('../repositories/notificationRepository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { sendPasswordChangedEmail, sendEmailChangedNotification } = require('../services/emailService');

/**
 * GET /api/users/me
 * Protected: USER, ADMIN, SUPER_ADMIN
 * Retrieves authenticated user's profile and role-relevant stats.
 * Strictly never returns password hashes.
 */
const getCurrentUserProfile = async (req, res, next) => {
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
        const mySubsResult = await getUserSubmissions(user.id, { limit: 1000 });
        const mySubs = Array.isArray(mySubsResult) ? mySubsResult : (mySubsResult?.records || []);
        stats = {
          totalSubmissions: mySubsResult?.totalCount ?? mySubs.length,
          approved: mySubs.filter(s => s.status === 'APPROVED').length,
          pending: mySubs.filter(s => s.status === 'PENDING').length,
          rejected: mySubs.filter(s => s.status === 'REJECTED').length
        };
      } else if (user.role === 'ADMIN') {
        const allSubs = await getAllSubmissions();
        const allUsers = await getAllUsers();
        stats = {
          totalUsers: allUsers.length,
          totalCreators: allUsers.filter(u => u.role === 'USER').length,
          totalAdmins: allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length,
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me
 * Protected: USER, ADMIN, SUPER_ADMIN
 * Allows updating allowed profile fields (name).
 * Strictly prevents changing own role, status, id, password, or email.
 */
const updateCurrentUserProfile = async (req, res, next) => {
  try {
    const { name, role, status, password, id, email } = req.body;

    // Security: Prevent users from changing their own role
    if (role !== undefined && role !== req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'ROLE_MODIFICATION_PROHIBITED',
        message: 'Modifying account role is strictly restricted to Super Administrators via user governance.'
      });
    }

    // Security: Prevent users from changing protected account fields
    if (status !== undefined && status !== req.user.status) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Modifying account status is not permitted via profile update.'
      });
    }

    if (password !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Passwords cannot be changed through this endpoint. Please use PUT /api/users/change-password.'
      });
    }

    if (id !== undefined && id !== req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Modifying account identifier is not permitted.'
      });
    }

    if (email !== undefined && email.trim().toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email address is a protected account credential and cannot be modified directly.'
      });
    }

    // Validate allowed profile fields: name
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 70) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Name is required and must be between 2 and 70 characters.'
      });
    }

    const updated = await updateUser(req.user.id, { name: name.trim() });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'User profile could not be updated.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/change-password
 * Protected: USER, ADMIN, SUPER_ADMIN
 * Security:
 * - Verify current password before changing it
 * - Hash new password using bcrypt
 * - Never return password hashes
 */
const changeUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Current password is required.'
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New password is required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New password must be at least 8 characters long.'
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New password and confirmation password do not match.'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New password must be different from current password.'
      });
    }

    // Retrieve user including current password hash
    const user = await findUserById(req.user.id);
    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    // Verify current password with bcrypt
    const isCurrentValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'The current password you provided is incorrect.'
      });
    }

    // Hash new password using bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Save updated password
    await updateUser(req.user.id, { password: hashedPassword });

    // Send in-app security alert notification
    try {
      await createNotification({
        userId: req.user.id,
        type: 'ACCOUNT_ALERT',
        title: 'Password Changed',
        message: 'Your portal account password was successfully updated. If you did not make this change, please contact support immediately.'
      });
    } catch (notifErr) {
      console.warn('[changeUserPassword] Failed to send notification:', notifErr.message);
    }

    // Send transactional security email notification
    sendPasswordChangedEmail(user, {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown',
      time: new Date().toUTCString()
    }).catch(mailErr => {
      console.warn('[changeUserPassword] Password changed email skipped:', mailErr.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/change-email
 * Protected: USER, ADMIN, SUPER_ADMIN
 * Security:
 * - Requires currentPassword verification via bcrypt
 * - Validates newEmail format and uniqueness
 * - Updates user email in DB
 * - Dispatches dual notification emails:
 *     1. Notice to old email address ("Your account email was changed")
 *     2. Confirmation to new email address ("Your email has been added to the account")
 * - Dispatches internal security alert notification
 */
const changeUserEmail = async (req, res, next) => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New email address is required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedNewEmail = newEmail.trim().toLowerCase();

    if (!emailRegex.test(normalizedNewEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Please provide a valid new email address.'
      });
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Current password is required to verify your identity.'
      });
    }

    // Fetch user to verify credentials
    const user = await findUserById(req.user.id);
    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    if (user.email.toLowerCase() === normalizedNewEmail) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New email address cannot be the same as your current email address.'
      });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'The current password you provided is incorrect.'
      });
    }

    // Check if new email is already in use
    const existing = await findUserByEmail(normalizedNewEmail);
    if (existing && existing.id !== user.id) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'This email address is already associated with another account.'
      });
    }

    const oldEmail = user.email;

    // Update in database first
    const updatedUser = await updateUser(user.id, { email: normalizedNewEmail });

    // Send in-app notification
    try {
      await createNotification({
        userId: user.id,
        type: 'ACCOUNT_ALERT',
        title: 'Account Email Changed',
        message: `Your account email address was changed from ${oldEmail} to ${normalizedNewEmail}.`
      });
    } catch (notifErr) {
      console.warn('[changeUserEmail] In-app notification failed:', notifErr.message);
    }

    // Send transactional security email notifications (dual: old + new)
    sendEmailChangedNotification({
      user: updatedUser,
      oldEmail,
      newEmail: normalizedNewEmail,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown'
    }).catch(mailErr => {
      console.warn('[changeUserEmail] Email change notifications skipped:', mailErr.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Account email updated successfully. Security notifications have been dispatched.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

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
        const mySubsResult = await getUserSubmissions(user.id, { limit: 1000 });
        const mySubs = Array.isArray(mySubsResult) ? mySubsResult : (mySubsResult?.records || []);
        stats = {
          totalSubmissions: mySubsResult?.totalCount ?? mySubs.length,
          approved: mySubs.filter(s => s.status === 'APPROVED').length,
          pending: mySubs.filter(s => s.status === 'PENDING').length,
          rejected: mySubs.filter(s => s.status === 'REJECTED').length
        };
      } else if (user.role === 'ADMIN') {
        const allSubs = await getAllSubmissions();
        const allUsers = await getAllUsers();
        stats = {
          totalUsers: allUsers.length,
          totalCreators: allUsers.filter(u => u.role === 'USER').length,
          totalAdmins: allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length,
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
    const { page, limit, search, role, status, startDate, endDate, sortBy, sortOrder } = req.query;

    if (page || limit || search || role || status || startDate || endDate || sortBy) {
      const result = await getUsersPaginated({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search: search || '',
        role: role || 'ALL',
        status: status || 'ALL',
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      });

      return res.status(200).json({
        success: true,
        count: result.users.length,
        data: result.users,
        pagination: result.pagination,
        stats: result.stats,
        filters: {
          page: result.pagination.currentPage,
          limit: result.pagination.limit,
          search: search || null,
          role: role || 'ALL',
          status: status || 'ALL',
          startDate: startDate || null,
          endDate: endDate || null,
          sortBy: sortBy || 'createdAt',
          sortOrder: sortOrder || 'desc'
        }
      });
    }

    const users = await getAllUsers();
    const stats = {
      total: users.length,
      active: users.filter(u => u.status === 'ACTIVE').length,
      inactive: users.filter(u => u.status === 'INACTIVE').length,
      suspended: users.filter(u => u.status === 'SUSPENDED').length,
      usersCount: users.filter(u => u.role === 'USER').length,
      adminsCount: users.filter(u => u.role === 'ADMIN').length,
      superAdminsCount: users.filter(u => u.role === 'SUPER_ADMIN').length
    };
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Protected: ADMIN, SUPER_ADMIN
 * Retrieves detailed user profile and activity counts without exposing password hash.
 */
const getUserDetailsController = async (req, res, next) => {
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

    // Notify user of important admin role modification
    try {
      await createNotification({
        userId: id,
        type: 'ACCOUNT_ALERT',
        title: 'Account Role Updated',
        message: `Your account role was updated to ${role} by administrator ${req.user.name}.`,
      });
    } catch (notifErr) {
      console.warn('[userController] Failed to dispatch role change notification:', notifErr.message);
    }

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
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changeUserPassword,
  changeUserEmail,
  getUserProfile,
  listUsers,
  getUserDetails: getUserDetailsController,
  changeRole
};

