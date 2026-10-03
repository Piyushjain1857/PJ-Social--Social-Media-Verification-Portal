const {
  getAllSubmissions,
  getSubmissionsPaginated,
  getUserSubmissions,
  getSubmissionById,
  createSubmission,
  reviewSubmission: updateReview
} = require('../repositories/submissionRepository');
const {
  getOfficialAccountById,
  getActiveOfficialAccounts
} = require('../repositories/socialAccountRepository');
const { validateSubmissionPostUrl } = require('../utils/urlValidator');
const { createNotification } = require('../repositories/notificationRepository');
const { awardPoints } = require('../services/pointsService');
const { processSubmissionVerdict } = require('../services/submissionApprovalService');
const { sendSubmissionReceivedEmail } = require('../services/emailService');

/**
 * POST /api/submissions
 * Protected: Normal USER only
 * Submits evidence (screenshot + metadata) of social media activity for admin review.
 * Default status is PENDING.
 * Must be associated with an active official college social media account.
 */
const create = async (req, res, next) => {
  try {
    const { platform, actionType, postUrl, description, socialAccountId } = req.body;

    // Prefer the securely-generated ref from the upload middleware.
    // Fall back to body.screenshotUrl only for external-URL mode.
    let screenshotUrl = req.uploadedFile?.screenshotRef || req.body.screenshotUrl || null;

    // Validate platform
    const validPlatforms = ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'];
    if (!platform || !validPlatforms.includes(platform.toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PLATFORM',
        message: `Platform is required and must be one of: ${validPlatforms.join(', ')}`
      });
    }

    const cleanPlatform = platform.toUpperCase();

    // Validate action type
    const validActionTypes = ['LIKE', 'COMMENT', 'STORY'];
    if (!actionType || !validActionTypes.includes(actionType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ACTION_TYPE',
        message: `Action type is required and must be one of: ${validActionTypes.join(', ')}`
      });
    }

    // Validate postUrl & Platform Domain Integrity
    const postUrlValidation = validateSubmissionPostUrl(cleanPlatform, postUrl);
    if (!postUrlValidation.valid) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_URL',
        message: postUrlValidation.message
      });
    }
    const trimmedUrl = postUrlValidation.cleanUrl;

    // Verify Active Official Social Account
    let officialAccount = null;
    if (socialAccountId) {
      officialAccount = await getOfficialAccountById(socialAccountId);
      if (!officialAccount) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_OFFICIAL_ACCOUNT',
          message: 'Selected official social account does not exist.'
        });
      }
      if (!officialAccount.isActive) {
        return res.status(400).json({
          success: false,
          code: 'INACTIVE_OFFICIAL_ACCOUNT',
          message: 'Selected official social account is currently inactive. Submissions can only be made against active official college accounts.'
        });
      }
      if (officialAccount.platform !== cleanPlatform) {
        return res.status(400).json({
          success: false,
          code: 'PLATFORM_MISMATCH',
          message: `Selected official account platform (${officialAccount.platform}) does not match submission platform (${cleanPlatform}).`
        });
      }
    } else {
      const activeAccounts = await getActiveOfficialAccounts(cleanPlatform);
      if (!activeAccounts || activeAccounts.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'NO_ACTIVE_OFFICIAL_ACCOUNT',
          message: `No active official college accounts found for ${cleanPlatform}. Submissions can only be made against active official accounts.`
        });
      }
      officialAccount = activeAccounts[0];
    }

    // Validate screenshot evidence
    if (!screenshotUrl || typeof screenshotUrl !== 'string' || !screenshotUrl.trim()) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_SCREENSHOT',
        message: 'Screenshot evidence is required for administrator review. Please upload an image file or provide a screenshot reference.'
      });
    }

    // Sanitize optional description (max 1000 chars)
    const sanitizedDescription = description && typeof description === 'string'
      ? description.trim().substring(0, 1000)
      : null;

    const newSub = await createSubmission({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      socialAccountId: officialAccount.id,
      platform: cleanPlatform,
      actionType: actionType.toUpperCase(),
      postUrl: trimmedUrl,
      screenshotUrl: screenshotUrl.trim(),
      description: sanitizedDescription,
      status: 'PENDING'
    });

    // Create acknowledgement notification for creator
    await createNotification({
      userId: req.user.id,
      type: 'SUBMISSION_UPDATE',
      title: 'Activity Submitted for Verification',
      message: `Your ${newSub.platform} ${newSub.actionType} submission for official account "${officialAccount.name || officialAccount.handle}" is now in the review queue. Status: PENDING manual admin review.`
    });

    // Dispatch optional transactional acknowledgement email (non-blocking, fault-tolerant)
    sendSubmissionReceivedEmail(req.user, newSub).catch(err => {
      console.warn('[SubmissionController] Submission received email notice:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Activity evidence submitted successfully and queued for administrator review.',
      disclaimer: 'Note: Uploaded screenshot evidence is subject to manual administrator review and does not constitute automated verification.',
      data: newSub
    });
  } catch (error) {
    next(error);
  }
};


/**
 * GET /api/submissions/my
 * Protected: Authenticated user (USER, ADMIN, SUPER_ADMIN)
 * Returns submissions owned by the currently authenticated user.
 */
const getMy = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      platform,
      actionType,
      startDate,
      endDate,
      sortBy,
      sortOrder
    } = req.query;
    
    const result = await getUserSubmissions(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      status,
      platform,
      actionType,
      startDate,
      endDate,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
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
      },
      filters: {
        search: search || null,
        status: status || 'ALL',
        platform: platform || 'ALL',
        actionType: actionType || 'ALL',
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/submissions
 * Protected: ADMIN, SUPER_ADMIN only
 * Returns all submissions across the platform with full server-side filtering, sorting, pagination & search.
 * USER role receives 403 Forbidden via route middleware.
 */
const getAll = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      platform,
      actionType,
      reviewerId,
      userId,
      startDate,
      endDate,
      sortBy,
      sortOrder
    } = req.query;

    const result = await getSubmissionsPaginated({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      status,
      platform,
      actionType,
      reviewerId,
      userId,
      startDate,
      endDate,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
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
      },
      filters: {
        search: search || null,
        status: status || 'ALL',
        platform: platform || 'ALL',
        actionType: actionType || 'ALL',
        reviewerId: reviewerId || null,
        userId: userId || null,
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/submissions/:id
 * Protected: Authenticated.
 * Non-admins can only view their own submissions.
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const submission = await getSubmissionById(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found.'
      });
    }

    // Role-based data access control:
    // USER can only access their own submissions
    const isOwner = submission.userId === req.user.id;
    const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN_OWNERSHIP',
        message: 'Access denied. You can only view your own activity submissions.'
      });
    }

    return res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/submissions/:id/review
 * Protected: ADMIN, SUPER_ADMIN only
 * Evaluates and assigns APPROVED or REJECTED status with feedback.
 * USER role receives 403 Forbidden.
 */
const review = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    const result = await processSubmissionVerdict({
      submissionId: id,
      status,
      feedback,
      adminUser: req.user
    });

    const isApproved = result.submission.status === 'APPROVED';
    const pointsAwarded = result.pointsAwarded;

    return res.status(200).json({
      success: true,
      message: result.message || `Submission successfully marked as ${result.submission.status}.${pointsAwarded?.awarded ? ` +${pointsAwarded.points} points awarded.` : ''}`,
      data: {
        success: true,
        submission: result.submission,
        review: result.review,
        pointsAwarded: pointsAwarded || null
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || 'BAD_REQUEST',
        message: error.message,
        data: error.data || null
      });
    }
    next(error);
  }
};

const approve = async (req, res, next) => {
  req.body.status = 'APPROVED';
  return review(req, res, next);
};

const reject = async (req, res, next) => {
  req.body.status = 'REJECTED';
  return review(req, res, next);
};

module.exports = {
  create,
  getMy,
  getAll,
  getById,
  review,
  approve,
  reject
};
