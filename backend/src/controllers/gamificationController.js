const {
  getUserGamificationProfile,
  calculateUserXP,
  getActiveLevels,
  buildLevelThresholds,
  calculateUserLevel,
  getUserRankMetrics,
  getUserXPChartData,
  getUserRankHistory
} = require('../services/levelService');
const {
  getUserTransactionsHistory
} = require('../repositories/pointTransactionRepository');
const { prisma, checkDatabaseConnection } = require('../config/db');

const ACTION_NAMES = {
  LIKE: 'Like',
  COMMENT: 'Comment',
  STORY: 'Story',
  BONUS: 'Manual Bonus',
  ADJUSTMENT: 'Adjustment'
};

const ACTION_ICONS = {
  LIKE: '❤️',
  COMMENT: '💬',
  STORY: '📱',
  BONUS: '🎁',
  ADJUSTMENT: '⚖️'
};

function getSourceFromTx(tx) {
  if (tx.submission?.platform) {
    return tx.submission.platform;
  }
  if (tx.metadata?.platform) {
    return tx.metadata.platform;
  }
  if (tx.actionType === 'BONUS' || tx.actionType === 'ADJUSTMENT') {
    return tx.metadata?.adminName || 'Admin Bonus';
  }
  return 'Platform Activity';
}

/**
 * GET /api/gamification/me
 * Protected: Authenticated User
 * Returns user's totalXP, current level, progress, rank, recentXP, and thresholds.
 */
const getMyGamification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await getUserGamificationProfile(userId);

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/me/chart
 * Protected: Authenticated User
 * Returns user's XP progression over time with date, xp, level, and summary metrics.
 * Query param: timeframe (7d, 30d, 3m, 6m, all)
 */
const getMyXPChart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { timeframe = '30d' } = req.query;

    const chartData = await getUserXPChartData(userId, timeframe);

    return res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/me/rank
 * Protected: Authenticated User
 * Returns user's real leaderboard rank, total participants, users behind, and percentile ahead.
 */
const getMyRankMetrics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rankData = await getUserRankMetrics(userId);

    return res.status(200).json({
      success: true,
      data: rankData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/me/rank-history
 * Protected: Authenticated User
 * Section: "📊 My Position Over Time"
 * Returns monthly timeline snapshots of rank and XP, trajectory trend, and position changes.
 */
const getMyRankHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const historyData = await getUserRankHistory(userId);

    return res.status(200).json({
      success: true,
      data: historyData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/me/history
 * Protected: Authenticated User
 * Returns user's XP transactions with pagination and filters.
 */
const getMyXPHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== 'USER') {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        isParticipant: false,
        message: 'Administrators and Super Administrators manage points and do not participate in creator XP activities.',
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    const {
      page = 1,
      limit = 10,
      actionType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const result = await getUserTransactionsHistory(userId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      actionType,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    const rawRecords = result.records || result.transactions || [];

    // Ensure xp, action, source, icon fields are formatted clearly
    const formattedTransactions = rawRecords.map(tx => {
      const xpVal = tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points;
      const act = tx.actionType || 'BONUS';
      return {
        id: tx.id,
        userId: tx.userId,
        submissionId: tx.submissionId,
        actionType: act,
        actionName: ACTION_NAMES[act] || act,
        icon: ACTION_ICONS[act] || '⚡',
        xp: xpVal,
        points: tx.points,
        description: tx.description,
        source: getSourceFromTx(tx),
        date: tx.createdAt,
        createdAt: tx.createdAt,
        submission: tx.submission || null
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      data: formattedTransactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/levels
 * Public/Authenticated: Returns configured active levels with cumulative thresholds
 */
const getLevelsList = async (req, res, next) => {
  try {
    const levels = await getActiveLevels();
    const thresholds = buildLevelThresholds(levels);

    return res.status(200).json({
      success: true,
      count: thresholds.length,
      data: thresholds
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/me/journey
 * Protected: Authenticated User
 * Returns full level journey: all levels with completed/current/locked status for the user.
 */
const getMyLevelJourney = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch active levels and user profile in parallel
    const [activeLevels, userProfile] = await Promise.all([
      getActiveLevels(),
      getUserGamificationProfile(userId)
    ]);

    const thresholds = buildLevelThresholds(activeLevels);
    const currentLevelNumber = userProfile.currentLevel;

    // 2. Build journey - mark each level as completed, current, or locked
    const journey = thresholds.map((level, index) => {
      let status = 'locked';
      if (level.levelNumber < currentLevelNumber) {
        status = 'completed';
      } else if (level.levelNumber === currentLevelNumber) {
        status = 'current';
      }

      return {
        levelNumber: level.levelNumber,
        name: level.name,
        icon: level.icon || '⭐',
        description: level.description || `Level ${level.levelNumber} achievement`,
        xpRequired: level.xpRequired,
        cumulativeStartXP: level.cumulativeStartXP,
        cumulativeEndXP: level.cumulativeEndXP,
        status,
        isLast: level.isLast || index === thresholds.length - 1
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        journey,
        totalLevels: journey.length,
        currentLevel: currentLevelNumber,
        totalXP: userProfile.totalXP,
        isMaxLevel: userProfile.isMaxLevel
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/user/:id
 * Protected: ADMIN, SUPER_ADMIN only
 * Allows Admin to inspect any user's XP & level progression
 */
const getUserGamificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbStatus = await checkDatabaseConnection();

    if (dbStatus.isConnected && prisma) {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true, totalXP: true, totalPoints: true }
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }
    }

    const profile = await getUserGamificationProfile(id);

    // Also fetch active levels to compute lastLevelUpXP threshold
    const activeLevels = await getActiveLevels();
    const thresholds = buildLevelThresholds(activeLevels);
    const currentLevelThreshold = thresholds.find(t => t.levelNumber === profile.currentLevel);

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        // Extra fields for admin visibility
        cumulativeStartXP: currentLevelThreshold?.cumulativeStartXP ?? 0,
        totalLevels: thresholds.length
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/user/:id/chart
 * Protected: ADMIN, SUPER_ADMIN only
 */
const getUserXPChartById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { timeframe = '30d' } = req.query;

    const chartData = await getUserXPChartData(id, timeframe);

    return res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/user/:id/rank
 * Protected: ADMIN, SUPER_ADMIN only
 */
const getUserRankMetricsById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rankData = await getUserRankMetrics(id);

    return res.status(200).json({
      success: true,
      data: rankData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gamification/user/:id/rank-history
 * Protected: ADMIN, SUPER_ADMIN only
 */
const getUserRankHistoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const historyData = await getUserRankHistory(id);

    return res.status(200).json({
      success: true,
      data: historyData
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyGamification,
  getMyXPChart,
  getMyRankMetrics,
  getMyRankHistory,
  getMyXPHistory,
  getLevelsList,
  getMyLevelJourney,
  getUserGamificationById,
  getUserXPChartById,
  getUserRankMetricsById,
  getUserRankHistoryById
};
