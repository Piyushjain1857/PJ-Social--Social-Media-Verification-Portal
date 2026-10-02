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
 */
const getOverview = async (req, res) => {
  try {
    const data = await getSuperAdminOverview();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('[SuperAdminGamificationController] Overview error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Super Admin gamification overview.',
      error: err.message
    });
  }
};

const getUsers = async (req, res) => {
  try {
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
    console.error('[SuperAdminGamificationController] GetUsers error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform users gamification directory.',
      error: err.message
    });
  }
};

const getAdmins = async (req, res) => {
  try {
    const data = await getSuperAdminAdmins();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('[SuperAdminGamificationController] GetAdmins error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin gamification activity.',
      error: err.message
    });
  }
};

const getTransactions = async (req, res) => {
  try {
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
    console.error('[SuperAdminGamificationController] GetTransactions error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve XP transaction explorer data.',
      error: err.message
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const data = await getSuperAdminAnalytics();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('[SuperAdminGamificationController] Analytics error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve advanced gamification analytics.',
      error: err.message
    });
  }
};

const getSettings = async (req, res) => {
  try {
    const data = await getGamificationSettings();
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('[SuperAdminGamificationController] GetSettings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve gamification settings.',
      error: err.message
    });
  }
};

const updateSettings = async (req, res) => {
  try {
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
    console.error('[SuperAdminGamificationController] UpdateSettings error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update gamification settings.',
      error: err.message
    });
  }
};

const adjustUserXP = async (req, res) => {
  try {
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
    console.error('[SuperAdminGamificationController] AdjustUserXP error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to execute Super Admin XP adjustment.',
      error: err.message
    });
  }
};

const getAuditLogs = async (req, res) => {
  try {
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
    console.error('[SuperAdminGamificationController] AuditLogs error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve gamification audit logs.',
      error: err.message
    });
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
