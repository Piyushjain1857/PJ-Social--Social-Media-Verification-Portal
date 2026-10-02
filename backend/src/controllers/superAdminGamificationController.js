const {
  getGamificationSettings,
  updateGamificationSettings,
  getSuperAdminOverview,
  getSuperAdminUsers,
  getSuperAdminAdmins,
  getSuperAdminTransactions,
  getSuperAdminAnalytics,
  adjustUserXPAsSuperAdmin,
  getSuperAdminAuditLogs
} = require('../services/superAdminGamificationService');

/**
 * Super Admin Gamification Controller
 * Enforces strict SUPER_ADMIN role access and safe error handling without data leakage.
 */
const getOverview = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const data = await getSuperAdminOverview();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const {
      page,
      limit,
      search,
      role,
      level,
      minXP,
      maxXP,
      status,
      sortBy,
      sortOrder
    } = req.query;

    const result = await getSuperAdminUsers({
      page,
      limit,
      search,
      role,
      level,
      minXP,
      maxXP,
      status,
      sortBy,
      sortOrder
    });

    return res.json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

const getAdmins = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const data = await getSuperAdminAdmins();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const {
      page,
      limit,
      search,
      action,
      userId,
      actor,
      minXP,
      maxXP,
      startDate,
      endDate
    } = req.query;

    const result = await getSuperAdminTransactions({
      page,
      limit,
      search,
      action,
      userId,
      actor,
      minXP,
      maxXP,
      startDate,
      endDate
    });

    return res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const data = await getSuperAdminAnalytics();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const data = await getGamificationSettings();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const { updates, reason } = req.body;
    if (!updates) {
      return res.status(400).json({
        success: false,
        message: 'Missing updates in request body.'
      });
    }

    const data = await updateGamificationSettings({
      updates: Array.isArray(updates) ? updates : [updates],
      reason: reason || 'Super Admin policy update',
      adminUser: req.user
    });

    return res.json({
      success: true,
      message: 'Gamification rules successfully updated and synchronized.',
      data
    });
  } catch (err) {
    if (err.statusCode || err.code) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update gamification settings.'
      });
    }
    next(err);
  }
};

const adjustUserXP = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const targetUserId = req.params.id;
    const { type, amount, reason } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    const parsedAmountSA = parseInt(amount, 10);
    if (amount === undefined || amount === null || isNaN(parsedAmountSA) || parsedAmountSA <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment amount must be a positive integer greater than zero.'
      });
    }

    if (!reason || !reason.trim() || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Mandatory justification reason must be at least 3 characters.'
      });
    }

    const result = await adjustUserXPAsSuperAdmin({
      targetUserId,
      type: type === 'REMOVE' ? 'REMOVE' : 'ADD',
      amount: parsedAmountSA,
      reason: reason.trim(),
      adminUser: req.user
    });

    return res.json({
      success: true,
      message: `Successfully adjusted user XP by ${result.deltaXP > 0 ? '+' : ''}${result.deltaXP} XP.`,
      data: result
    });
  } catch (err) {
    if (err.statusCode || err.code) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to execute Super Admin XP adjustment.'
      });
    }
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Access denied. Super Administrator privileges required.'
      });
    }

    const { page, limit, action, actor, targetId, startDate, endDate } = req.query;
    const result = await getSuperAdminAuditLogs({
      page,
      limit,
      action,
      actor,
      targetId,
      startDate,
      endDate
    });

    return res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getUsers,
  getAdmins,
  getTransactions,
  getAnalytics,
  getSettings,
  updateSettings,
  adjustUserXP,
  getAuditLogs
};
