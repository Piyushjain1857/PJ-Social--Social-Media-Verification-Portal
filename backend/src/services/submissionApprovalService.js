const { prisma, checkDatabaseConnection } = require('../config/db');
const { calculateUserLevel } = require('./levelService');
const {
  sendSubmissionApprovedEmail,
  sendSubmissionRejectedEmail,
  sendLevelUpEmail
} = require('./emailService');

/**
 * Standard default XP values if DB configuration is missing or inactive
 */
const DEFAULT_XP_RULES = {
  LIKE: 1,
  COMMENT: 2,
  STORY: 2
};

/**
 * Atomic Submission Review & XP Awarding Service
 *
 * Implements the 10-step atomic moderation transaction:
 * 1. Verify submission exists
 * 2. Verify current status and state transition
 * 3. Verify authorized reviewer (ADMIN or SUPER_ADMIN)
 * 4. Update submission status to APPROVED or REJECTED & record Review
 * 5. Determine XP dynamically from database gamification_settings rules (backend authoritative)
 * 6. Create PointTransaction linked to submissionId
 * 7. Update user totalXP and totalPoints
 * 8. Detect level change dynamically against active level tiers
 * 9. Dispatch notifications (verdict notification + level-up alert if attained)
 * 10. Record immutable AuditLog entry
 *
 * All operations execute within an atomic Prisma $transaction.
 * If any step fails, the entire transaction is rolled back.
 *
 * Duplicate prevention:
 * - Pending → Approved = XP awarded
 * - Pending → Rejected = 0 XP
 * - Approved → Approved = no duplicate XP (idempotently prevented)
 * - Rejected → Approved = award XP only once according to defined business rules
 */
const processSubmissionVerdict = async ({
  submissionId,
  status,
  feedback,
  adminUser
}) => {
  if (!submissionId) {
    const err = new Error('Submission ID is required.');
    err.code = 'SUBMISSION_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  // 3. Verify authorized reviewer
  if (!adminUser || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
    const err = new Error('Unauthorized. Only administrators and super administrators can review submissions.');
    err.code = 'FORBIDDEN';
    err.statusCode = 403;
    throw err;
  }

  // Validate requested verdict status
  const cleanStatus = status ? status.toUpperCase().trim() : '';
  if (!['APPROVED', 'REJECTED'].includes(cleanStatus)) {
    const err = new Error('Review decision status must be either APPROVED or REJECTED.');
    err.code = 'INVALID_STATUS';
    err.statusCode = 400;
    throw err;
  }

  // Rejection requires meaningful feedback/reason
  if (cleanStatus === 'REJECTED' && (!feedback || !feedback.trim())) {
    const err = new Error('A rejection reason/feedback is mandatory so the creator understands what was missing.');
    err.code = 'FEEDBACK_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  const cleanFeedback = feedback && typeof feedback === 'string'
    ? feedback.trim().substring(0, 1000)
    : null;
  const reviewTimestamp = new Date();

  // Execute entire 10-step flow within an atomic Prisma database transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify submission exists
    const submission = await tx.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: true,
        pointTransactions: true
      }
    });

    if (!submission) {
      const err = new Error('Submission not found to review.');
      err.code = 'SUBMISSION_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const currentStatus = submission.status;
    const targetUser = submission.user;

    if (!targetUser) {
      const err = new Error('Submission creator user not found in database.');
      err.code = 'USER_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // 2. Verify current status & state transitions
    if (currentStatus === 'APPROVED') {
      if (cleanStatus === 'APPROVED') {
        // Prevent duplicate XP if approval endpoint is called twice
        const err = new Error('Submission is already approved. Cannot re-approve an approved submission.');
        err.code = 'ALREADY_APPROVED';
        err.statusCode = 400;
        err.data = {
          submission,
          alreadyApproved: true,
          duplicatePrevented: true,
          pointsAwarded: { awarded: false, alreadyAwarded: true, points: 0, xp: 0 }
        };
        throw err;
      }
      if (cleanStatus === 'REJECTED') {
        const err = new Error('Cannot reject an already approved and verified submission.');
        err.code = 'CANNOT_REJECT_APPROVED';
        err.statusCode = 400;
        throw err;
      }
    }

    if (currentStatus === 'REJECTED' && cleanStatus === 'REJECTED') {
      const err = new Error('Submission is already rejected. Cannot re-reject a rejected submission.');
      err.code = 'ALREADY_REJECTED';
      err.statusCode = 400;
      throw err;
    }

    // 4. Atomic conditional update to prevent concurrent review race conditions
    const updateResult = await tx.submission.updateMany({
      where: {
        id: submissionId,
        status: currentStatus
      },
      data: {
        status: cleanStatus,
        updatedAt: reviewTimestamp
      }
    });

    if (updateResult.count === 0) {
      const err = new Error('Submission is already approved or modified by another concurrent review.');
      err.code = 'ALREADY_APPROVED';
      err.statusCode = 400;
      err.data = {
        submissionId,
        alreadyApproved: true,
        duplicatePrevented: true,
        pointsAwarded: { awarded: false, alreadyAwarded: true, points: 0, xp: 0 }
      };
      throw err;
    }

    const updatedSubmission = await tx.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, totalXP: true, totalPoints: true } }
      }
    });

    const createdReview = await tx.review.create({
      data: {
        submissionId,
        adminId: adminUser.id,
        status: cleanStatus,
        feedback: cleanFeedback,
        createdAt: reviewTimestamp,
        updatedAt: reviewTimestamp
      },
      include: {
        admin: { select: { id: true, name: true, email: true } }
      }
    });

    // ------------------------------------------------------------------------
    // CASE A: REJECTED (Pending → Rejected = 0 XP)
    // ------------------------------------------------------------------------
    if (cleanStatus === 'REJECTED') {
      // 9. Dispatch rejection notification
      await tx.notification.create({
        data: {
          userId: submission.userId,
          type: 'REVIEW_FEEDBACK',
          title: 'Submission REJECTED',
          message: `Your ${submission.platform} activity submission was rejected by ${adminUser.name}. Reason: "${cleanFeedback}"`,
          metadata: {
            submissionId: submission.id,
            actionType: submission.actionType,
            status: 'REJECTED',
            feedback: cleanFeedback
          }
        }
      });

      // 10. Create audit log
      await tx.auditLog.create({
        data: {
          actor: adminUser.email || adminUser.name,
          action: 'SUBMISSION_REJECTED',
          entity: 'Submission',
          entityId: submission.id,
          details: `Admin ${adminUser.name} rejected submission ${submission.id} for creator ${targetUser.name} (${targetUser.email}). Reason: "${cleanFeedback}"`,
          metadata: {
            reviewerId: adminUser.id,
            reviewerRole: adminUser.role,
            userId: submission.userId,
            actionType: submission.actionType,
            platform: submission.platform,
            previousStatus: currentStatus,
            newStatus: 'REJECTED',
            xpAwarded: 0
          }
        }
      });

      return {
        success: true,
        submission: updatedSubmission,
        review: createdReview,
        pointsAwarded: {
          awarded: false,
          alreadyAwarded: false,
          points: 0,
          xp: 0
        },
        message: `Submission ${submissionId} has been marked as REJECTED.`
      };
    }

    // ------------------------------------------------------------------------
    // CASE B: APPROVED (Pending → Approved OR Rejected → Approved)
    // ------------------------------------------------------------------------

    // Check if points were already awarded for this submission
    // Guarantees: "Rejected → Approved = award XP only once according to the defined business rules"
    const existingTx = await tx.pointTransaction.findFirst({
      where: { submissionId }
    });

    let xpToAward = 0;
    let pointTransaction = null;
    const actionTypeUpper = (submission.actionType || 'LIKE').toUpperCase().trim();

    if (!existingTx) {
      // 5. Determine XP from current rules (DB configuration is authoritative)
      const setting = await tx.gamificationSetting.findUnique({
        where: { activity: actionTypeUpper }
      });

      if (setting && setting.isActive && typeof setting.xp === 'number') {
        xpToAward = setting.xp;
      } else {
        xpToAward = DEFAULT_XP_RULES[actionTypeUpper] ?? 1;
      }

      // 6. Create XP transaction
      if (xpToAward > 0) {
        pointTransaction = await tx.pointTransaction.create({
          data: {
            userId: submission.userId,
            submissionId: submission.id,
            points: xpToAward,
            xp: xpToAward,
            actionType: actionTypeUpper,
            description: `Approved ${submission.platform} ${actionTypeUpper} verification proof`,
            metadata: {
              reviewerId: adminUser.id,
              reviewerName: adminUser.name,
              reviewerRole: adminUser.role,
              feedback: cleanFeedback,
              platform: submission.platform,
              actionType: actionTypeUpper,
              previousStatus: currentStatus,
              awardedAt: reviewTimestamp.toISOString()
            }
          }
        });
      }
    }

    // 7. Update/calculate user XP
    const previousXP = targetUser.totalXP ?? targetUser.totalPoints ?? 0;
    const newTotalXP = previousXP + xpToAward;

    // 8. Detect level change
    const activeLevels = await tx.level.findMany({
      where: { isActive: true },
      orderBy: { levelNumber: 'asc' }
    });
    const previousLevelInfo = calculateUserLevel(previousXP, activeLevels);
    const newLevelInfo = calculateUserLevel(newTotalXP, activeLevels);
    const leveledUp = newLevelInfo.currentLevel > previousLevelInfo.currentLevel;

    // Update user balance in atomic transaction
    await tx.user.update({
      where: { id: submission.userId },
      data: {
        totalXP: newTotalXP,
        totalPoints: newTotalXP
      }
    });

    // 9. Dispatch notifications
    let notifMessage = `Your ${submission.platform} activity submission was approved by ${adminUser.name}.${cleanFeedback ? ` Feedback: "${cleanFeedback}"` : ''}`;
    if (xpToAward > 0) {
      notifMessage += ` You earned +${xpToAward} XP!`;
    }

    await tx.notification.create({
      data: {
        userId: submission.userId,
        type: 'REVIEW_FEEDBACK',
        title: 'Submission APPROVED',
        message: notifMessage,
        metadata: {
          submissionId: submission.id,
          actionType: actionTypeUpper,
          pointsAwarded: xpToAward,
          xp: xpToAward,
          totalXP: newTotalXP,
          currentLevel: newLevelInfo.currentLevel
        }
      }
    });

    if (leveledUp) {
      await tx.notification.create({
        data: {
          userId: submission.userId,
          type: 'ACCOUNT_ALERT',
          title: 'Level Up!',
          message: `🏆 Congratulations! You've reached Level ${newLevelInfo.currentLevel} (${newLevelInfo.levelName}) with ${newTotalXP.toLocaleString()} verified XP!`,
          metadata: {
            newLevel: newLevelInfo.currentLevel,
            levelName: newLevelInfo.levelName,
            totalXP: newTotalXP,
            icon: newLevelInfo.icon
          }
        }
      });
    }

    // 10. Create audit log
    await tx.auditLog.create({
      data: {
        actor: adminUser.email || adminUser.name,
        action: 'SUBMISSION_APPROVED',
        entity: 'Submission',
        entityId: submission.id,
        details: `Admin ${adminUser.name} approved submission ${submission.id} for creator ${targetUser.name} (${targetUser.email}). Awarded +${xpToAward} XP (Action: ${actionTypeUpper}, Platform: ${submission.platform}).`,
        metadata: {
          reviewerId: adminUser.id,
          reviewerRole: adminUser.role,
          userId: submission.userId,
          actionType: actionTypeUpper,
          platform: submission.platform,
          previousStatus: currentStatus,
          newStatus: 'APPROVED',
          xpAwarded: xpToAward,
          previousXP,
          newTotalXP,
          leveledUp,
          newLevel: newLevelInfo.currentLevel
        }
      }
    });

    return {
      success: true,
      submission: updatedSubmission,
      review: createdReview,
      pointsAwarded: {
        awarded: xpToAward > 0,
        alreadyAwarded: Boolean(existingTx),
        points: xpToAward,
        xp: xpToAward,
        totalPoints: newTotalXP,
        totalXP: newTotalXP,
        level: newLevelInfo,
        leveledUp,
        transaction: pointTransaction
      },
      message: `Submission ${submissionId} has been marked as APPROVED.${xpToAward > 0 ? ` +${xpToAward} XP awarded.` : ''}`
    };
  });
  if (result && result.submission) {
    try {
      const { syncInMemorySubmissionReview } = require('../repositories/submissionRepository');
      syncInMemorySubmissionReview(submissionId, result.submission.status, result.review);
    } catch (e) {
      // In-memory sync non-fatal
    }

    // Real-time UI synchronization: broadcast XP, level-up celebration, and leaderboard shift
    try {
      const realtimeService = require('./realtimeGamificationService');
      const userId = result.submission.userId;
      const pa = result.pointsAwarded;

      if (pa && pa.awarded) {
        realtimeService.broadcastUserXPUpdated(userId, {
          userId,
          totalXP: pa.totalXP,
          currentLevel: pa.level.currentLevel,
          levelName: pa.level.levelName,
          icon: pa.level.icon,
          progressPercentage: pa.level.progressPercentage,
          xpRemaining: pa.level.xpRemaining,
          deltaXP: pa.xp,
          reason: 'SUBMISSION_APPROVED',
          actionType: result.submission.actionType,
          submissionId: result.submission.id,
          timestamp: new Date().toISOString()
        });

        if (pa.leveledUp) {
          realtimeService.broadcastLevelUp(userId, {
            userId,
            currentLevel: pa.level.currentLevel,
            levelName: pa.level.levelName,
            icon: pa.level.icon,
            totalXP: pa.totalXP,
            nextLevel: pa.level.nextLevel,
            nextLevelName: pa.level.nextLevelName,
            timestamp: new Date().toISOString()
          });
        }

        realtimeService.broadcastLeaderboardUpdated();
      }
    } catch (rtErr) {
      console.warn('[SubmissionApproval] Realtime broadcast notice:', rtErr.message);
    }

    // Transactional Email Notifications (Fault-tolerant, non-blocking)
    try {
      const recipientUser = result.submission.user;
      if (recipientUser && recipientUser.email) {
        if (result.submission.status === 'APPROVED') {
          sendSubmissionApprovedEmail(recipientUser, result.submission, result.pointsAwarded).catch(err => {
            console.warn('[SubmissionApproval] Approval email notification skipped:', err.message);
          });

          if (result.pointsAwarded?.leveledUp && result.pointsAwarded?.level) {
            sendLevelUpEmail(recipientUser, result.pointsAwarded.level).catch(err => {
              console.warn('[SubmissionApproval] Level-up email notification skipped:', err.message);
            });
          }
        } else if (result.submission.status === 'REJECTED') {
          sendSubmissionRejectedEmail(recipientUser, result.submission, result.review?.feedback).catch(err => {
            console.warn('[SubmissionApproval] Rejection email notification skipped:', err.message);
          });
        }
      }
    } catch (emailErr) {
      console.warn('[SubmissionApproval] Email dispatch caught non-fatally:', emailErr.message);
    }
  }

  return result;
};


module.exports = {
  processSubmissionVerdict,
  DEFAULT_XP_RULES
};
