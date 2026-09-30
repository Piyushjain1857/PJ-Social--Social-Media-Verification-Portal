const {
  getAllSubmissions,
  getUserSubmissions,
  getSubmissionById,
  createSubmission,
  reviewSubmission: updateReview
} = require('../repositories/submissionRepository');
const { createNotification } = require('../repositories/notificationRepository');

/**
 * POST /api/submissions
 * Protected: Normal USER only
 * Submits evidence (screenshot + metadata) of social media activity for admin review.
 * Default status is PENDING.
 */
const create = async (req, res, next) => {
  try {
    const { platform, actionType, postUrl, description } = req.body;

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

    // Validate action type
    const validActionTypes = ['LIKE', 'COMMENT', 'STORY'];
    if (!actionType || !validActionTypes.includes(actionType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ACTION_TYPE',
        message: `Action type is required and must be one of: ${validActionTypes.join(', ')}`
      });
    }

    // Validate postUrl
    if (!postUrl || typeof postUrl !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'MISSING_URL',
        message: 'A post or profile URL is required.'
      });
    }

    const trimmedUrl = postUrl.trim();
    try {
      const parsedUrl = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return res.status(400).json({
        success: false,
        code: 'INVALID_URL',
        message: 'A valid http:// or https:// post/account URL is required.'
      });
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
      platform: platform.toUpperCase(),
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
      message: `Your ${newSub.platform} ${newSub.actionType} submission is now in the review queue. Status: PENDING manual admin review.`
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
    const { page, limit, search, status, platform } = req.query;
    
    const result = await getUserSubmissions(req.user.id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      status,
      platform
    });
    
    return res.status(200).json({
      success: true,
      count: result.records.length,
      data: result.records,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/submissions
 * Protected: ADMIN, SUPER_ADMIN only
 * Returns all submissions across the platform for review/moderation.
 * USER role receives 403 Forbidden via route middleware.
 */
const getAll = async (req, res, next) => {
  try {
    const submissions = await getAllSubmissions();
    return res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
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

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Review decision status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const existing = await getSubmissionById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Submission to review was not found.'
      });
    }

    const result = await updateReview(id, {
      status: status.toUpperCase(),
      feedback: feedback?.trim() || null,
      adminId: req.user.id,
      adminName: req.user.name
    });

    // Notify the submission owner of the verdict
    await createNotification({
      userId: existing.userId,
      type: 'REVIEW_FEEDBACK',
      title: `Submission ${status.toUpperCase()}`,
      message: `Your ${existing.platform} activity submission was ${status.toLowerCase()} by ${req.user.name}.${feedback ? ` Feedback: "${feedback}"` : ''}`
    });

    return res.status(200).json({
      success: true,
      message: `Submission successfully marked as ${status.toUpperCase()}.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getMy,
  getAll,
  getById,
  review
};
