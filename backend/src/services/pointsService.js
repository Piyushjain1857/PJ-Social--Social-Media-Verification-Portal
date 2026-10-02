const {
  findTransactionBySubmissionId,
  createPointTransaction,
  getUserPointsSummary,
  getUserTransactionsHistory,
  getAllPointTransactions,
  getLeaderboardData,
  getUserRankData,
  getAdminGamificationOverviewData
} = require('../repositories/pointTransactionRepository');
const { createNotification } = require('../repositories/notificationRepository');

const { prisma } = require('../config/db');

/**
 * Standard Point Values for Institutional Activity Verifications:
 * - LIKE: 1 point
 * - COMMENT: 2 points
 * - STORY: 2 points
 */
const POINT_VALUES = {
  LIKE: 1,
  COMMENT: 2,
  STORY: 2
};

// Dynamic in-memory points cache synced from database
const ACTIVE_POINT_CONFIG = { ...POINT_VALUES };

// Asynchronously sync from database gamification_settings table
const syncPointConfigFromDB = async () => {
  try {
    if (prisma?.gamificationSetting) {
      const settings = await prisma.gamificationSetting.findMany({
        where: { isActive: true }
      });
      for (const s of settings) {
        if (s.activity) {
          ACTIVE_POINT_CONFIG[s.activity.toUpperCase()] = s.xp;
        }
      }
    }
  } catch (err) {
    // Non-fatal fallback
  }
};
syncPointConfigFromDB();

const setActivityPointConfig = (activity, xp) => {
  if (activity) {
    ACTIVE_POINT_CONFIG[activity.toUpperCase()] = Math.max(0, parseInt(xp, 10) || 0);
  }
};

const getActivityPointConfig = () => ({ ...ACTIVE_POINT_CONFIG });

/**
 * Configurable Level System Definition:
 * 0–99:    Beginner    (Level 1)
 * 100–249:  Active      (Level 2)
 * 250–499:  Contributor (Level 3)
 * 500–999:  Elite       (Level 4)
 * 1000+:    Champion    (Level 5)
 */
const LEVEL_TIERS = [
  { level: 1, name: 'Beginner', badge: '🌱', minPoints: 0, maxPoints: 99, color: '#94a3b8' },
  { level: 2, name: 'Active', badge: '⚡', minPoints: 100, maxPoints: 249, color: '#38bdf8' },
  { level: 3, name: 'Contributor', badge: '🚀', minPoints: 250, maxPoints: 499, color: '#a855f7' },
  { level: 4, name: 'Elite', badge: '💎', minPoints: 500, maxPoints: 999, color: '#ec4899' },
  { level: 5, name: 'Champion', badge: '👑', minPoints: 1000, maxPoints: Infinity, color: '#facc15' }
];

/**
 * Calculate user level, current points, points required for next level, and progress percentage.
 * @param {number} totalPoints
 * @returns {Object} Level computation object
 */
const calculateUserLevel = (totalPoints = 0) => {
  const points = Math.max(0, parseInt(totalPoints, 10) || 0);

  const currentTier = LEVEL_TIERS.find(t => points >= t.minPoints && points <= t.maxPoints)
    || LEVEL_TIERS[LEVEL_TIERS.length - 1];

  const nextTierIndex = LEVEL_TIERS.findIndex(t => t.level === currentTier.level) + 1;
  const nextTier = nextTierIndex < LEVEL_TIERS.length ? LEVEL_TIERS[nextTierIndex] : null;

  let progressPercentage = 100;
  let pointsToNextLevel = 0;

  if (nextTier) {
    const tierRange = nextTier.minPoints - currentTier.minPoints;
    const progressInTier = points - currentTier.minPoints;
    progressPercentage = Math.min(100, Math.max(0, Math.round((progressInTier / tierRange) * 100)));
    pointsToNextLevel = Math.max(0, nextTier.minPoints - points);
  }

  return {
    level: currentTier.level,
    name: currentTier.name,
    badge: currentTier.badge,
    color: currentTier.color,
    currentPoints: points,
    nextLevel: nextTier ? nextTier.level : null,
    nextLevelName: nextTier ? nextTier.name : null,
    nextLevelBadge: nextTier ? nextTier.badge : null,
    nextLevelMinPoints: nextTier ? nextTier.minPoints : null,
    pointsToNextLevel,
    progressPercentage,
    description: `Level ${currentTier.level} — ${currentTier.name}`,
    isMaxLevel: !nextTier
  };
};

/**
 * Calculates point value for a verified social media action type.
 * @param {string} actionType - 'LIKE' | 'COMMENT' | 'STORY' | string
 * @returns {number} Point value awarded upon approval (1, 2, or 0)
 */
const getPointsForAction = (actionType) => {
  if (!actionType || typeof actionType !== 'string') return 0;
  const upper = actionType.toUpperCase().trim();
  if (ACTIVE_POINT_CONFIG[upper] !== undefined) {
    return ACTIVE_POINT_CONFIG[upper];
  }
  return POINT_VALUES[upper] !== undefined ? POINT_VALUES[upper] : 0;
};

/**
 * Check if a submission has already been awarded points.
 * Ensures strict idempotency: the same submission must never award points twice.
 * @param {string} submissionId
 * @returns {Promise<boolean>} True if already awarded, false otherwise
 */
const preventDuplicateAward = async (submissionId) => {
  if (!submissionId) return false;
  const existing = await findTransactionBySubmissionId(submissionId);
  return Boolean(existing);
};

/**
 * Awards gamification points to a creator when an activity submission is APPROVED.
 * Automatically enforces:
 * - Duplicate prevention check
 * - Proper point calculation per actionType
 * - Atomic balance increment
 * - Audit trail logging
 * - Level-up detection & notification
 * 
 * @param {Object} params
 * @param {string} params.userId - Creator recipient
 * @param {string} params.submissionId - Verification submission
 * @param {string} params.actionType - 'LIKE' | 'COMMENT' | 'STORY'
 * @param {string} [params.description] - Description for transaction
 * @param {string} [params.reviewerId] - Admin who approved
 * @param {string} [params.reviewerName] - Name of reviewer
 * @returns {Promise<Object>} Award result with points, transaction, and new totalPoints
 */
const awardPoints = async ({
  userId,
  submissionId,
  actionType,
  description,
  reviewerId = null,
  reviewerName = null
}) => {
  if (!userId) {
    throw new Error('User ID is required to award gamification points.');
  }

  // Fetch current summary before award to evaluate level progression
  const initialSummary = await getUserPointsSummary(userId);
  const previousLevel = calculateUserLevel(initialSummary.totalPoints);

  // 1. Prevent duplicate point awards if approval endpoint is called multiple times
  if (submissionId) {
    const isAlreadyAwarded = await preventDuplicateAward(submissionId);
    if (isAlreadyAwarded) {
      const existingTx = await findTransactionBySubmissionId(submissionId);
      return {
        awarded: false,
        alreadyAwarded: true,
        points: 0,
        message: 'Points have already been awarded for this approved submission.',
        transaction: existingTx,
        totalPoints: initialSummary.totalPoints,
        level: previousLevel
      };
    }
  }

  // 2. Calculate point value
  const points = getPointsForAction(actionType);
  if (points <= 0) {
    return {
      awarded: false,
      alreadyAwarded: false,
      points: 0,
      message: `No points configured for action type "${actionType}".`,
      transaction: null,
      level: previousLevel
    };
  }

  // 3. Create PointTransaction record
  const desc = description || `Earned +${points} point${points > 1 ? 's' : ''} for approved ${actionType} proof`;
  const metadata = {
    actionType,
    approvedBy: reviewerId,
    reviewerName: reviewerName || 'Admin Moderator',
    awardedAt: new Date().toISOString()
  };

  const result = await createPointTransaction({
    userId,
    submissionId: submissionId || null,
    points,
    actionType: actionType.toUpperCase(),
    description: desc,
    metadata
  });

  const newLevel = calculateUserLevel(result.totalPoints);

  // Check if user reached a new level
  if (newLevel.level > previousLevel.level) {
    try {
      await createNotification({
        userId,
        type: 'ACCOUNT_ALERT',
        title: 'Level Up!',
        message: `🏆 Congratulations! You've reached the ${newLevel.name} level (${newLevel.badge}) with ${result.totalPoints} verified points.`,
        metadata: {
          newLevel: newLevel.level,
          levelName: newLevel.name,
          totalPoints: result.totalPoints
        }
      });
    } catch (lvlErr) {
      console.warn('[PointsService] Could not send level-up notification:', lvlErr.message);
    }
  }

  return {
    awarded: true,
    alreadyAwarded: false,
    points,
    xp: points,
    transaction: result.transaction,
    totalPoints: result.totalPoints,
    totalXP: result.totalPoints,
    level: newLevel,
    leveledUp: newLevel.level > previousLevel.level
  };
};

/**
 * Retrieve user points summary, balance, weekly/monthly points, and level breakdown.
 * @param {string} userId
 */
const getUserPoints = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to fetch points summary.');
  }
  const summary = await getUserPointsSummary(userId);
  const level = calculateUserLevel(summary.totalPoints);

  return {
    ...summary,
    level
  };
};

/**
 * Retrieve paginated points history for a user.
 */
const getUserPointsHistory = async (userId, options = {}) => {
  if (!userId) {
    throw new Error('User ID is required to fetch points history.');
  }
  return getUserTransactionsHistory(userId, options);
};

/**
 * Super Admin: Retrieve all point transactions across all users.
 */
const getAllTransactions = async (options = {}) => {
  return getAllPointTransactions(options);
};

/**
 * Retrieve portal-wide leaderboard data with timeframe filters.
 */
const getLeaderboard = async ({ timeframe = 'all_time', page = 1, limit = 20 }) => {
  const result = await getLeaderboardData({ timeframe, page, limit });

  // Enrich rows with level data
  const enrichedLeaderboard = result.leaderboard.map(row => ({
    ...row,
    level: calculateUserLevel(row.totalPoints)
  }));

  return {
    ...result,
    leaderboard: enrichedLeaderboard
  };
};

/**
 * Retrieve authenticated user's ranking and difference to next rank.
 */
const getUserRank = async (userId, timeframe = 'all_time') => {
  if (!userId) {
    throw new Error('User ID is required to fetch user ranking.');
  }
  const rankData = await getUserRankData(userId, timeframe);
  const level = calculateUserLevel(rankData.totalPoints);

  return {
    ...rankData,
    level
  };
};

/**
 * Admin: Retrieve gamification overview of creators.
 */
const getAdminOverview = async (options = {}) => {
  const result = await getAdminGamificationOverviewData(options);

  const enrichedUsers = result.users.map(u => ({
    ...u,
    level: calculateUserLevel(u.totalPoints)
  }));

  return {
    ...result,
    users: enrichedUsers
  };
};

/**
 * Super Admin manual adjustment of user points.
 * Must require: user, points (integer, positive or negative), reason.
 * Creates an auditable ADJUSTMENT transaction and updates user balance.
 */
const adjustPoints = async ({
  userId,
  points,
  reason,
  adminId,
  adminName
}) => {
  if (!userId) {
    const err = new Error('Target user ID is mandatory for points adjustment.');
    err.code = 'USER_REQUIRED';
    throw err;
  }

  const deltaPoints = parseInt(points, 10);
  if (isNaN(deltaPoints) || deltaPoints === 0) {
    const err = new Error('Points adjustment must be a non-zero integer.');
    err.code = 'INVALID_POINTS';
    throw err;
  }

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    const err = new Error('A detailed reason is mandatory for manual points adjustments.');
    err.code = 'REASON_REQUIRED';
    throw err;
  }

  const initialSummary = await getUserPointsSummary(userId);
  const previousLevel = calculateUserLevel(initialSummary.totalPoints);

  const cleanReason = reason.trim();
  const desc = `Manual Adjustment: ${deltaPoints > 0 ? '+' : ''}${deltaPoints} pts (${cleanReason})`;

  const metadata = {
    adjustedBy: adminId,
    adminName: adminName || 'Super Administrator',
    reason: cleanReason,
    timestamp: new Date().toISOString()
  };

  const result = await createPointTransaction({
    userId,
    submissionId: null,
    points: deltaPoints,
    actionType: 'ADJUSTMENT',
    description: desc,
    metadata
  });

  const newLevel = calculateUserLevel(result.totalPoints);

  // Generate an auditable notification for the user
  try {
    let notifMessage = `Your points balance was adjusted by ${deltaPoints > 0 ? '+' : ''}${deltaPoints} point(s) by ${adminName || 'Super Administrator'}. Reason: "${cleanReason}". New total: ${result.totalPoints} points.`;
    if (newLevel.level > previousLevel.level) {
      notifMessage += ` 🏆 You've also reached the ${newLevel.name} level!`;
    }

    await createNotification({
      userId,
      type: 'ACCOUNT_ALERT',
      title: 'Points Balance Adjusted',
      message: notifMessage,
      metadata: {
        pointsAdjusted: deltaPoints,
        newTotal: result.totalPoints,
        newLevel: newLevel.level,
        adjustedBy: adminName
      }
    });
  } catch (notifErr) {
    console.warn('[PointsService] Could not send adjustment notification:', notifErr.message);
  }

  return {
    success: true,
    pointsAdjusted: deltaPoints,
    newTotalPoints: result.totalPoints,
    level: newLevel,
    transaction: result.transaction,
    reason: cleanReason
  };
};

module.exports = {
  POINT_VALUES,
  LEVEL_TIERS,
  calculateUserLevel,
  getPointsForAction,
  setActivityPointConfig,
  getActivityPointConfig,
  syncPointConfigFromDB,
  preventDuplicateAward,
  awardPoints,
  getUserPoints,
  getUserPointsHistory,
  getAllTransactions,
  getLeaderboard,
  getUserRank,
  getAdminOverview,
  adjustPoints
};
