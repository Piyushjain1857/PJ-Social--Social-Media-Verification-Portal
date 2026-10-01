const {
  getUserGamificationProfile,
  calculateUserXP,
  getActiveLevels,
  buildLevelThresholds,
  calculateUserLevel
} = require('../services/levelService');
const {
  getUserTransactionsHistory
} = require('../repositories/pointTransactionRepository');
const { prisma, checkDatabaseConnection } = require('../config/db');

/**
 * GET /api/gamification/me
 * Protected: Authenticated User
 * Returns user's totalXP, current level, progress, and thresholds.
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
 * GET /api/gamification/me/history
 * Protected: Authenticated User
 * Returns user's XP transactions with pagination and filters.
 */
const getMyXPHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
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

    // Ensure xp field is formatted clearly
    const formattedTransactions = rawRecords.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      submissionId: tx.submissionId,
      actionType: tx.actionType,
      xp: tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points,
      points: tx.points,
      description: tx.description,
      createdAt: tx.createdAt,
      submission: tx.submission || null
    }));

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

module.exports = {
  getMyGamification,
  getMyXPHistory,
  getLevelsList,
  getMyLevelJourney,
  getUserGamificationById
};
