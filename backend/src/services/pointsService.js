const {
  findTransactionBySubmissionId,
  createPointTransaction,
  getUserPointsSummary,
  getUserTransactionsHistory
} = require('../repositories/pointTransactionRepository');
const { createNotification } = require('../repositories/notificationRepository');

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

/**
 * Calculates point value for a verified social media action type.
 * @param {string} actionType - 'LIKE' | 'COMMENT' | 'STORY' | string
 * @returns {number} Point value awarded upon approval (1, 2, or 0)
 */
const getPointsForAction = (actionType) => {
  if (!actionType || typeof actionType !== 'string') return 0;
  const upper = actionType.toUpperCase().trim();
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

  // 1. Prevent duplicate point awards if approval endpoint is called multiple times
  if (submissionId) {
    const isAlreadyAwarded = await preventDuplicateAward(submissionId);
    if (isAlreadyAwarded) {
      const existingTx = await findTransactionBySubmissionId(submissionId);
      const userSummary = await getUserPointsSummary(userId);
      return {
        awarded: false,
        alreadyAwarded: true,
        points: 0,
        message: 'Points have already been awarded for this approved submission.',
        transaction: existingTx,
        totalPoints: userSummary.totalPoints
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
      transaction: null
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

  return {
    awarded: true,
    alreadyAwarded: false,
    points,
    transaction: result.transaction,
    totalPoints: result.totalPoints
  };
};

/**
 * Retrieve user points summary, balance, and breakdown.
 * @param {string} userId
 */
const getUserPoints = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to fetch points summary.');
  }
  return getUserPointsSummary(userId);
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

  // Generate an auditable notification for the user
  try {
    await createNotification({
      userId,
      type: 'ACCOUNT_ALERT',
      title: 'Points Balance Adjusted',
      message: `Your gamification points balance was adjusted by ${deltaPoints > 0 ? '+' : ''}${deltaPoints} point(s) by ${adminName || 'Super Administrator'}. Reason: "${cleanReason}". New total: ${result.totalPoints} points.`,
      metadata: {
        pointsAdjusted: deltaPoints,
        newTotal: result.totalPoints,
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
    transaction: result.transaction,
    reason: cleanReason
  };
};

module.exports = {
  POINT_VALUES,
  getPointsForAction,
  preventDuplicateAward,
  awardPoints,
  getUserPoints,
  getUserPointsHistory,
  adjustPoints
};
