const {
  getAdminGamificationUsers,
  getAdminGamificationUserDetails,
  getAdminGamificationAnalytics,
  adjustUserXP
} = require('../services/adminGamificationService');
const { getUserTransactionsHistory } = require('../repositories/pointTransactionRepository');

const ACTION_NAMES = {
  LIKE: 'Like',
  COMMENT: 'Comment',
  STORY: 'Story',
  BONUS: 'Manual Bonus',
  ADJUSTMENT: 'Adjustment',
  ADMIN_ADJUSTMENT: 'Admin Adjustment',
  SUPER_ADMIN_ADJUSTMENT: 'Super Admin Adjustment'
};

const ACTION_ICONS = {
  LIKE: '❤️',
  COMMENT: '💬',
  STORY: '📱',
  BONUS: '🎁',
  ADJUSTMENT: '⚖️',
  ADMIN_ADJUSTMENT: '⚖️',
  SUPER_ADMIN_ADJUSTMENT: '👑'
};

/**
 * GET /api/admin/gamification/users
 * Lists creators with gamification status, search, filters, sorting, and pagination
 */
const getUsersList = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      level = '',
      minXP = '',
      maxXP = '',
      status = '',
      sortBy = 'highest_xp'
    } = req.query;

    const result = await getAdminGamificationUsers({
      page,
      limit,
      search,
      level,
      minXP,
      maxXP,
      status,
      sortBy
    });

    return res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/gamification/users/:id
 * Retrieves a complete gamification dossier for a single creator
 */
const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dossier = await getAdminGamificationUserDetails(id);

    return res.status(200).json({
      success: true,
      data: dossier
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code || 'BAD_REQUEST',
        message: err.message
      });
    }
    next(err);
  }
};

/**
 * GET /api/admin/gamification/analytics
 * Retrieves portal-wide gamification analytics, XP distribution, and level stats
 */
const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await getAdminGamificationAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/gamification/users/:id/adjust-xp
 * Admin / Super Admin manual adjustment of creator XP
 */
const postAdjustXP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'ADD', amount, reason } = req.body;

    const result = await adjustUserXP({
      userId: id,
      type,
      amount,
      reason,
      adminUser: req.user
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code || 'BAD_REQUEST',
        message: err.message
      });
    }
    next(err);
  }
};

/**
 * GET /api/admin/gamification/users/:id/history
 * Paginated XP transaction ledger for a specific creator
 */
const getUserHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, actionType } = req.query;

    const txResult = await getUserTransactionsHistory(id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      actionType
    });

    const rawRecords = txResult.records || txResult.transactions || [];
    const formatted = rawRecords.map(tx => {
      const xpVal = tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points;
      const act = tx.actionType || 'BONUS';
      const source = tx.metadata?.actor || tx.metadata?.actorName || tx.metadata?.adminName || (act === 'SUPER_ADMIN_ADJUSTMENT' ? 'Super Admin' : (act === 'ADMIN_ADJUSTMENT' || act === 'ADJUSTMENT' ? 'Admin' : (tx.metadata?.platform || tx.submission?.platform || 'Platform Activity')));
      return {
        id: tx.id,
        actionType: act,
        actionName: ACTION_NAMES[act] || act,
        icon: ACTION_ICONS[act] || '⚡',
        xp: xpVal,
        points: tx.points,
        description: tx.description,
        source,
        metadata: tx.metadata || null,
        date: tx.createdAt,
        createdAt: tx.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        page: txResult.page || 1,
        limit: txResult.limit || 10,
        totalCount: txResult.totalCount || formatted.length,
        totalPages: txResult.totalPages || 1,
        hasNext: txResult.hasNext || false,
        hasPrev: txResult.hasPrev || false
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsersList,
  getUserDetails,
  getAnalytics,
  postAdjustXP,
  getUserHistory
};
