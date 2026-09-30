const { prisma, checkDatabaseConnection } = require('../config/db');
const {
  getSubmissionById,
  getAllSubmissions,
  reviewSubmission,
} = require('../repositories/submissionRepository');
const { createNotification } = require('../repositories/notificationRepository');

/**
 * GET /api/reviews/pending
 * Protected: ADMIN, SUPER_ADMIN only
 *
 * Retrieves a filtered, searchable, and paginated list of submissions in the moderation queue.
 * Default status is 'PENDING', but moderators can filter by status, platform, actionType,
 * date range, or creator search terms.
 */
const getPendingReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      platform,
      actionType,
      status,
      startDate,
      endDate,
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const dbStatus = await checkDatabaseConnection();

    if (dbStatus.isConnected && prisma) {
      try {
        const where = {};

        // Status filter (default to PENDING if not specified or 'ALL')
        if (status && status.toUpperCase() !== 'ALL') {
          where.status = status.toUpperCase();
        } else if (!status) {
          where.status = 'PENDING';
        }

        // Platform filter
        if (platform && platform.toUpperCase() !== 'ALL') {
          where.platform = platform.toUpperCase();
        }

        // Action type filter
        if (actionType && actionType.toUpperCase() !== 'ALL') {
          where.actionType = actionType.toUpperCase();
        }

        // Search across postUrl, description, creator name, creator email
        if (search && search.trim()) {
          const q = search.trim();
          where.OR = [
            { postUrl: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ];
        }

        // Date range filtering
        const fromDateStr = startDate || dateFrom;
        const toDateStr = endDate || dateTo;

        if (fromDateStr) {
          const from = new Date(fromDateStr);
          if (!isNaN(from.getTime())) {
            from.setHours(0, 0, 0, 0);
            where.createdAt = { ...(where.createdAt || {}), gte: from };
          }
        }

        if (toDateStr) {
          const to = new Date(toDateStr);
          if (!isNaN(to.getTime())) {
            to.setHours(23, 59, 59, 999);
            where.createdAt = { ...(where.createdAt || {}), lte: to };
          }
        }

        const totalCount = await prisma.submission.count({ where });
        const records = await prisma.submission.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                createdAt: true,
              },
            },
            reviews: {
              include: {
                admin: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        });

        const formatted = records.map((sub) => ({
          ...sub,
          userName: sub.user?.name || 'Creator',
          userEmail: sub.user?.email || '',
        }));

        return res.status(200).json({
          success: true,
          count: formatted.length,
          data: formatted,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
          },
          filters: {
            status: where.status || 'ALL',
            platform: platform || 'ALL',
            actionType: actionType || 'ALL',
            search: search || null,
          },
          disclaimer:
            'Human verification required: VeriSocial does not claim or perform automated platform scraping. Verify evidence screenshot authenticity manually.',
        });
      } catch (prismaErr) {
        console.warn(
          '[ReviewCtrl] Prisma getPendingReviews failed, falling back to repository:',
          prismaErr.message
        );
      }
    }

    // In-Memory Fallback
    const allSubs = await getAllSubmissions();
    let filtered = [...allSubs];

    const targetStatus = status && status.toUpperCase() !== 'ALL' ? status.toUpperCase() : !status ? 'PENDING' : null;
    if (targetStatus) {
      filtered = filtered.filter((s) => s.status === targetStatus);
    }

    if (platform && platform.toUpperCase() !== 'ALL') {
      filtered = filtered.filter((s) => s.platform === platform.toUpperCase());
    }

    if (actionType && actionType.toUpperCase() !== 'ALL') {
      filtered = filtered.filter((s) => s.actionType === actionType.toUpperCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.postUrl && s.postUrl.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.userName && s.userName.toLowerCase().includes(q)) ||
          (s.userEmail && s.userEmail.toLowerCase().includes(q))
      );
    }

    const fromDateStr = startDate || dateFrom;
    if (fromDateStr) {
      const from = new Date(fromDateStr);
      if (!isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        filtered = filtered.filter((s) => new Date(s.createdAt) >= from);
      }
    }

    const toDateStr = endDate || dateTo;
    if (toDateStr) {
      const to = new Date(toDateStr);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter((s) => new Date(s.createdAt) <= to);
      }
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalCount = filtered.length;
    const paginated = filtered.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      count: paginated.length,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      filters: {
        status: targetStatus || 'ALL',
        platform: platform || 'ALL',
        actionType: actionType || 'ALL',
        search: search || null,
      },
      disclaimer:
        'Human verification required: VeriSocial does not claim or perform automated platform scraping. Verify evidence screenshot authenticity manually.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reviews/submission/:id
 * GET /api/reviews/:id
 * Protected: ADMIN, SUPER_ADMIN only
 *
 * Returns detailed submission verification dossier:
 * - Full submission data
 * - Creator profile & historical verification metrics (trust score, past approvals)
 * - Verification guidelines checklist for human inspection
 * - Past review timeline
 */
const getSubmissionReviewDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbStatus = await checkDatabaseConnection();

    let submission = null;
    let creatorStats = {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      trustScore: 100,
    };

    if (dbStatus.isConnected && prisma) {
      try {
        submission = await prisma.submission.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                createdAt: true,
              },
            },
            reviews: {
              include: {
                admin: { select: { id: true, name: true, email: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (submission && submission.userId) {
          // Query creator's historical submission track record
          const userSubs = await prisma.submission.groupBy({
            by: ['status'],
            where: { userId: submission.userId },
            _count: { status: true },
          });

          const counts = userSubs.reduce((acc, row) => {
            acc[row.status] = row._count.status;
            return acc;
          }, {});

          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          const approved = counts.APPROVED || 0;
          const rejected = counts.REJECTED || 0;
          const pending = counts.PENDING || 0;

          creatorStats = {
            total,
            approved,
            rejected,
            pending,
            trustScore: total > 0 ? Math.round((approved / total) * 100) : 100,
          };
        }
      } catch (prismaErr) {
        console.warn(
          '[ReviewCtrl] Prisma getSubmissionReviewDetails failed, checking memory:',
          prismaErr.message
        );
      }
    }

    if (!submission) {
      submission = await getSubmissionById(id);
    }

    if (!submission) {
      return res.status(404).json({
        success: false,
        code: 'SUBMISSION_NOT_FOUND',
        message: 'Submission not found in moderation repository.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        submission: {
          ...submission,
          userName: submission.userName || submission.user?.name || 'Creator',
          userEmail: submission.userEmail || submission.user?.email || '',
        },
        creator: {
          id: submission.user?.id || submission.userId,
          name: submission.user?.name || submission.userName || 'Creator',
          email: submission.user?.email || submission.userEmail || '',
          status: submission.user?.status || 'ACTIVE',
          memberSince: submission.user?.createdAt || null,
          stats: creatorStats,
        },
        verificationGuide: {
          notice:
            'Admin review is a human verification process. The portal does not perform automated scraping or claim the action is genuine without manual confirmation.',
          checklist: [
            {
              id: 'handle',
              label: 'Creator Identity',
              instruction: 'Confirm visible account handle/profile in proof matches creator identity.',
            },
            {
              id: 'timestamp',
              label: 'Active Window',
              instruction: 'Confirm engagement timestamp is within the active verification campaign window.',
            },
            {
              id: 'action',
              label: 'Action Consistency',
              instruction: `Verify that proof shows action [${submission.actionType}] performed on [${submission.platform}].`,
            },
            {
              id: 'integrity',
              label: 'Evidence Authenticity',
              instruction: 'Inspect screenshot for tampering, uncropped mobile UI, and authentic interaction indicators.',
            },
          ],
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reviews/:id
 * POST /api/reviews/submission/:id
 * Protected: ADMIN, SUPER_ADMIN only
 *
 * Processes human verification decision (APPROVE or REJECT).
 */
const submitReviewVerdict = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    // Validate verdict status
    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: 'Review decision status must be either APPROVED or REJECTED.',
      });
    }

    const cleanStatus = status.toUpperCase();

    // Feedback is strongly required for rejections to guide creator
    if (cleanStatus === 'REJECTED' && (!feedback || !feedback.trim())) {
      return res.status(400).json({
        success: false,
        code: 'FEEDBACK_REQUIRED',
        message: 'A rejection reason/feedback is mandatory so the creator understands what was missing.',
      });
    }

    const cleanFeedback = feedback && typeof feedback === 'string'
      ? feedback.trim().substring(0, 1000)
      : null;

    const result = await reviewSubmission(id, {
      status: cleanStatus,
      feedback: cleanFeedback,
      adminId: req.user.id,
      adminName: req.user.name,
    });

    if (result.error) {
      const statusCode = result.code === 'SUBMISSION_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        code: result.code,
        message: result.message,
      });
    }

    // Create creator notification
    const isApproved = cleanStatus === 'APPROVED';
    await createNotification({
      userId: result.submission.userId,
      type: 'REVIEW_FEEDBACK',
      title: `Submission ${cleanStatus}`,
      message: isApproved
        ? `Your ${result.submission.platform} activity submission was approved by ${req.user.name}.${cleanFeedback ? ` Feedback: "${cleanFeedback}"` : ''}`
        : `Your ${result.submission.platform} activity submission was rejected by ${req.user.name}. Reason: "${cleanFeedback}"`,
    });

    return res.status(200).json({
      success: true,
      message: `Submission ${id} has been marked as ${cleanStatus}.`,
      data: result,
      verificationNote:
        'Human moderator determination applied. Social media engagement proof logged.',
    });
  } catch (err) {
    next(err);
  }
};

const approveReview = async (req, res, next) => {
  req.body.status = 'APPROVED';
  return submitReviewVerdict(req, res, next);
};

const rejectReview = async (req, res, next) => {
  req.body.status = 'REJECTED';
  return submitReviewVerdict(req, res, next);
};

module.exports = {
  getPendingReviews,
  getSubmissionReviewDetails,
  submitReviewVerdict,
  approveReview,
  rejectReview,
};
