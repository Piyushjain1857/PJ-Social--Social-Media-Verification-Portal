const {
  getUserPoints,
  getUserPointsHistory,
  getAllTransactions,
  getLeaderboard,
  getUserRank,
  getAdminOverview,
  adjustPoints
} = require('../services/pointsService');
const { findUserById } = require('../repositories/userRepository');

/**
 * GET /api/points/me
 * Retrieves current user's total points, level progression, weekly/monthly stats, and activity breakdown.
 */
const getMyPoints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const summary = await getUserPoints(userId);

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/points/me/history
 * Returns paginated point transactions for the authenticated caller with search & filters.
 */
const getMyHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, search, actionType, startDate, endDate, sortBy, sortOrder } = req.query;

    const result = await getUserPointsHistory(userId, {
      page,
      limit,
      search,
      actionType,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      count: result.records.length,
      data: result.records,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/points/me/rank or GET /api/leaderboard/me
 * Returns authenticated user's current leaderboard rank and points required for next rank.
 */
const getMyRank = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { timeframe = 'all_time' } = req.query;

    const rankData = await getUserRank(userId, timeframe);

    return res.status(200).json({
      success: true,
      data: rankData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard or GET /api/points/leaderboard
 * Returns portal-wide leaderboard ranked by total points, with timeframe filters (all_time, this_month, this_week).
 */
const getLeaderboardList = async (req, res, next) => {
  try {
    const { timeframe = 'all_time', page = 1, limit = 20 } = req.query;

    const result = await getLeaderboard({
      timeframe,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });

    return res.status(200).json({
      success: true,
      timeframe: result.timeframe,
      data: {
        leaderboard: result.leaderboard,
        pagination: result.pagination,
        timeframe: result.timeframe
      },
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/points/user/:id
 * Admin/Super Admin only: Inspect points summary, level, and breakdown for any creator user.
 */
const getUserPointsById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const targetUser = await findUserById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Target user does not exist.'
      });
    }

    const summary = await getUserPoints(id);

    return res.status(200).json({
      success: true,
      data: {
        ...summary,
        userRole: targetUser.role,
        userStatus: targetUser.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/points/admin/overview
 * Admin & Super Admin: Overview list of creator users with gamification metrics, level, and approved submissions.
 */
const getAdminOverviewView = async (req, res, next) => {
  try {
    const { page = 1, limit = 15, search = '' } = req.query;

    const result = await getAdminOverview({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 15,
      search: search.trim()
    });

    return res.status(200).json({
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/points/all
 * Super Admin only: Global audit log of all point transactions across the platform.
 */
const getAllTransactionsAdmin = async (req, res, next) => {
  try {
    const { page, limit, search, actionType, startDate, endDate, sortBy, sortOrder } = req.query;

    const result = await getAllTransactions({
      page,
      limit,
      search,
      actionType,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      count: result.records.length,
      data: result.records,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/points/adjust
 * Super Admin only: Manually adjust creator points with an auditable reason.
 */
const adjustUserPoints = async (req, res, next) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'USER_REQUIRED',
        message: 'Target userId is mandatory.'
      });
    }

    const deltaPoints = parseInt(points, 10);
    if (isNaN(deltaPoints) || deltaPoints === 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_POINTS',
        message: 'Points adjustment must be a non-zero integer (e.g. +5 or -2).'
      });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'A detailed justification reason is mandatory for manual points adjustments.'
      });
    }

    // Verify target user exists
    const targetUser = await findUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Target user does not exist.'
      });
    }

    if (targetUser.role !== 'USER') {
      return res.status(400).json({
        success: false,
        code: 'ADMIN_CANNOT_HAVE_POINTS',
        message: 'Game points can only be awarded to normal creator users. Administrators and Super Administrators manage points and cannot hold game points.'
      });
    }

    const result = await adjustPoints({
      userId,
      points: deltaPoints,
      reason: reason.trim(),
      adminId: req.user.id,
      adminName: req.user.name
    });

    return res.status(200).json({
      success: true,
      message: `Points balance for ${targetUser.name} adjusted by ${deltaPoints > 0 ? '+' : ''}${deltaPoints}.`,
      data: result
    });
  } catch (error) {
    if (error.code) {
      return res.status(400).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  getMyPoints,
  getMyHistory,
  getMyRank,
  getLeaderboardList,
  getUserPointsById,
  getAdminOverviewView,
  getAllTransactionsAdmin,
  adjustUserPoints
};
