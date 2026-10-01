const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory submissions store seeded with representative realistic submissions
const inMemorySubmissions = new Map();

const initializeInMemorySubmissions = () => {
  if (inMemorySubmissions.size > 0) return;

  const defaultSubmissions = [
    {
      id: 'sub-001',
      userId: 'usr-user-003',
      userName: 'Sarah Connor (Creator)',
      userEmail: 'user@portal.com',
      platform: 'INSTAGRAM',
      actionType: 'LIKE',
      postUrl: 'https://instagram.com/p/DF123abc456',
      screenshotUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60',
      description: 'Liked the official product announcement post on @VeriSocialApp',
      status: 'PENDING',
      createdAt: new Date('2026-02-10T11:30:00Z'),
      updatedAt: new Date('2026-02-10T11:30:00Z'),
      reviews: []
    },
    {
      id: 'sub-002',
      userId: 'usr-user-003',
      userName: 'Sarah Connor (Creator)',
      userEmail: 'user@portal.com',
      platform: 'LINKEDIN',
      actionType: 'COMMENT',
      postUrl: 'https://linkedin.com/feed/update/urn:li:activity:71625344901',
      screenshotUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=60',
      description: 'Engaged with thoughtful feedback on the decentralized identity article.',
      status: 'APPROVED',
      createdAt: new Date('2026-02-08T09:15:00Z'),
      updatedAt: new Date('2026-02-09T14:20:00Z'),
      reviews: [
        {
          id: 'rev-001',
          submissionId: 'sub-002',
          adminId: 'usr-admin-002',
          adminName: 'Marcus Brody (Admin Moderator)',
          status: 'APPROVED',
          feedback: 'Clear proof provided and handle matches registered LinkedIn profile.',
          createdAt: new Date('2026-02-09T14:20:00Z')
        }
      ]
    },
    {
      id: 'sub-003',
      userId: 'usr-user-003',
      userName: 'Sarah Connor (Creator)',
      userEmail: 'user@portal.com',
      platform: 'FACEBOOK',
      actionType: 'STORY',
      postUrl: 'https://facebook.com/stories/109283749219',
      screenshotUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=60',
      description: 'Shared summer community campaign to Facebook 24-hr story.',
      status: 'REJECTED',
      createdAt: new Date('2026-02-05T16:45:00Z'),
      updatedAt: new Date('2026-02-06T10:10:00Z'),
      reviews: [
        {
          id: 'rev-002',
          submissionId: 'sub-003',
          adminId: 'usr-admin-002',
          adminName: 'Marcus Brody (Admin Moderator)',
          status: 'REJECTED',
          feedback: 'Screenshot does not show timestamp within 24 hours of campaign launch.',
          createdAt: new Date('2026-02-06T10:10:00Z')
        }
      ]
    }
  ];

  defaultSubmissions.forEach(sub => inMemorySubmissions.set(sub.id, sub));
};

initializeInMemorySubmissions();

const getAllSubmissions = async () => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const records = await prisma.submission.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          socialAccount: { select: { id: true, name: true, platform: true, handle: true, accountUrl: true } },
          reviews: { include: { admin: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (records && records.length > 0) return records;
    } catch (err) {
      console.warn('[SubRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  return Array.from(inMemorySubmissions.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

/**
 * Advanced server-side filtered, sorted, and paginated query for all platform submissions.
 * Supports status, platform, actionType, reviewerId, userId, date range, search, sorting.
 */
const getSubmissionsPaginated = async (filters = {}) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  const {
    page = 1,
    limit = 10,
    search = '',
    status = 'ALL',
    platform = 'ALL',
    actionType = 'ALL',
    reviewerId = null,
    userId = null,
    startDate = null,
    endDate = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';

  if (dbStatus.isConnected && prisma) {
    try {
      const where = {};

      if (status && status !== 'ALL') {
        where.status = status.toUpperCase();
      }

      if (platform && platform !== 'ALL') {
        where.platform = platform.toUpperCase();
      }

      if (actionType && actionType !== 'ALL') {
        where.actionType = actionType.toUpperCase();
      }

      if (userId && userId !== 'ALL') {
        where.userId = userId;
      }

      if (reviewerId && reviewerId !== 'ALL') {
        where.reviews = {
          some: {
            adminId: reviewerId
          }
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          const from = new Date(startDate);
          if (!isNaN(from.getTime())) {
            from.setHours(0, 0, 0, 0);
            where.createdAt.gte = from;
          }
        }
        if (endDate) {
          const to = new Date(endDate);
          if (!isNaN(to.getTime())) {
            to.setHours(23, 59, 59, 999);
            where.createdAt.lte = to;
          }
        }
      }

      if (trimmedSearch) {
        where.OR = [
          { postUrl: { contains: trimmedSearch, mode: 'insensitive' } },
          { description: { contains: trimmedSearch, mode: 'insensitive' } },
          { user: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
          { user: { email: { contains: trimmedSearch, mode: 'insensitive' } } },
          { socialAccount: { handle: { contains: trimmedSearch, mode: 'insensitive' } } },
          { socialAccount: { name: { contains: trimmedSearch, mode: 'insensitive' } } }
        ];
      }

      const validSortFields = ['createdAt', 'status', 'platform', 'actionType', 'updatedAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const cleanSortOrder = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

      const [totalCount, records] = await Promise.all([
        prisma.submission.count({ where }),
        prisma.submission.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, status: true } },
            socialAccount: { select: { id: true, name: true, platform: true, handle: true, accountUrl: true } },
            reviews: {
              include: { admin: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'desc' }
            },
            internalNotes: {
              include: { admin: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' }
            },
            clarifications: {
              include: { admin: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { [sortField]: cleanSortOrder },
          skip,
          take: parsedLimit
        })
      ]);

      const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

      return {
        records,
        totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasNext: parsedPage < totalPages,
        hasPrev: parsedPage > 1
      };
    } catch (err) {
      console.warn('[SubRepo] Prisma getSubmissionsPaginated failed, falling back to memory store:', err.message);
    }
  }

  // In-Memory Fallback
  let memoryRecords = Array.from(inMemorySubmissions.values());

  if (status && status !== 'ALL') {
    memoryRecords = memoryRecords.filter(s => s.status === status.toUpperCase());
  }
  if (platform && platform !== 'ALL') {
    memoryRecords = memoryRecords.filter(s => s.platform === platform.toUpperCase());
  }
  if (actionType && actionType !== 'ALL') {
    memoryRecords = memoryRecords.filter(s => s.actionType === actionType.toUpperCase());
  }
  if (userId && userId !== 'ALL') {
    memoryRecords = memoryRecords.filter(s => s.userId === userId);
  }
  if (reviewerId && reviewerId !== 'ALL') {
    memoryRecords = memoryRecords.filter(s => s.reviews && s.reviews.some(r => r.adminId === reviewerId));
  }
  if (startDate) {
    const from = new Date(startDate);
    if (!isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      memoryRecords = memoryRecords.filter(s => new Date(s.createdAt) >= from);
    }
  }
  if (endDate) {
    const to = new Date(endDate);
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      memoryRecords = memoryRecords.filter(s => new Date(s.createdAt) <= to);
    }
  }
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    memoryRecords = memoryRecords.filter(s =>
      (s.postUrl && s.postUrl.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.userName && s.userName.toLowerCase().includes(q)) ||
      (s.userEmail && s.userEmail.toLowerCase().includes(q))
    );
  }

  const cleanSortOrder = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
  memoryRecords.sort((a, b) => {
    let valA = a[sortBy] || a.createdAt;
    let valB = b[sortBy] || b.createdAt;
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    if (cleanSortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  const totalCount = memoryRecords.length;
  const paginated = memoryRecords.slice(skip, skip + parsedLimit);
  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  return {
    records: paginated,
    totalCount,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    hasNext: parsedPage < totalPages,
    hasPrev: parsedPage > 1
  };
};

const getUserSubmissions = async (userId, filters = {}) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  const {
    page = 1,
    limit = 10,
    search = '',
    status = 'ALL',
    platform = 'ALL',
    actionType = 'ALL',
    startDate = null,
    endDate = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';

  if (dbStatus.isConnected && prisma) {
    try {
      const where = { userId };
      
      if (status && status !== 'ALL') where.status = status.toUpperCase();
      if (platform && platform !== 'ALL') where.platform = platform.toUpperCase();
      if (actionType && actionType !== 'ALL') where.actionType = actionType.toUpperCase();
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          const from = new Date(startDate);
          if (!isNaN(from.getTime())) {
            from.setHours(0, 0, 0, 0);
            where.createdAt.gte = from;
          }
        }
        if (endDate) {
          const to = new Date(endDate);
          if (!isNaN(to.getTime())) {
            to.setHours(23, 59, 59, 999);
            where.createdAt.lte = to;
          }
        }
      }

      if (trimmedSearch) {
        where.OR = [
          { postUrl: { contains: trimmedSearch, mode: 'insensitive' } },
          { description: { contains: trimmedSearch, mode: 'insensitive' } }
        ];
      }

      const validSortFields = ['createdAt', 'status', 'platform', 'actionType', 'updatedAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const cleanSortOrder = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

      const [totalCount, records] = await Promise.all([
        prisma.submission.count({ where }),
        prisma.submission.findMany({
          where,
          include: {
            socialAccount: { select: { id: true, name: true, platform: true, handle: true, accountUrl: true } },
            reviews: {
              include: { admin: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' }
            },
            clarifications: {
              include: { admin: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { [sortField]: cleanSortOrder },
          skip,
          take: parsedLimit
        })
      ]);

      const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

      return {
        records,
        totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasNext: parsedPage < totalPages,
        hasPrev: parsedPage > 1
      };
    } catch (err) {
      console.warn('[SubRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  let memoryRecords = Array.from(inMemorySubmissions.values())
    .filter(s => s.userId === userId);
    
  if (status && status !== 'ALL') memoryRecords = memoryRecords.filter(s => s.status === status.toUpperCase());
  if (platform && platform !== 'ALL') memoryRecords = memoryRecords.filter(s => s.platform === platform.toUpperCase());
  if (actionType && actionType !== 'ALL') memoryRecords = memoryRecords.filter(s => s.actionType === actionType.toUpperCase());
  if (startDate) {
    const from = new Date(startDate);
    if (!isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      memoryRecords = memoryRecords.filter(s => new Date(s.createdAt) >= from);
    }
  }
  if (endDate) {
    const to = new Date(endDate);
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      memoryRecords = memoryRecords.filter(s => new Date(s.createdAt) <= to);
    }
  }
  if (trimmedSearch) {
    const s = trimmedSearch.toLowerCase();
    memoryRecords = memoryRecords.filter(sub => 
      (sub.postUrl && sub.postUrl.toLowerCase().includes(s)) ||
      (sub.description && sub.description.toLowerCase().includes(s))
    );
  }

  const cleanSortOrder = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
  memoryRecords.sort((a, b) => {
    let valA = a[sortBy] || a.createdAt;
    let valB = b[sortBy] || b.createdAt;
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    if (cleanSortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  const totalCount = memoryRecords.length;
  const paginated = memoryRecords.slice(skip, skip + parsedLimit);
  const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

  return {
    records: paginated,
    totalCount,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    hasNext: parsedPage < totalPages,
    hasPrev: parsedPage > 1
  };
};

const getSubmissionById = async (id) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const record = await prisma.submission.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
          socialAccount: { select: { id: true, name: true, platform: true, handle: true, accountUrl: true } },
          reviews: {
            include: { admin: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
          },
          internalNotes: {
            include: { admin: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
          },
          clarifications: {
            include: { admin: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      if (record) return record;
    } catch (err) {
      console.warn('[SubRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  return inMemorySubmissions.get(id) || null;
};

const createSubmission = async ({ userId, userName, userEmail, socialAccountId, platform, actionType, postUrl, screenshotUrl, description }) => {
  initializeInMemorySubmissions();
  const id = `sub-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const newSubmission = {
    id,
    userId,
    userName: userName || 'Creator',
    userEmail: userEmail || '',
    socialAccountId: socialAccountId || null,
    platform,
    actionType,
    postUrl,
    screenshotUrl: screenshotUrl || null,
    description: description || null,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    reviews: []
  };

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const created = await prisma.submission.create({
        data: {
          userId,
          socialAccountId: socialAccountId || null,
          platform,
          actionType,
          postUrl,
          screenshotUrl,
          description,
          status: 'PENDING'
        },
        include: {
          socialAccount: { select: { id: true, name: true, platform: true, handle: true, accountUrl: true } },
          reviews: { include: { admin: { select: { id: true, name: true } } } }
        }
      });
      inMemorySubmissions.set(created.id, { ...newSubmission, id: created.id });
      return created;
    } catch (err) {
      console.warn('[SubRepo] Prisma creation failed, storing in memory store:', err.message);
    }
  }

  inMemorySubmissions.set(id, newSubmission);
  return newSubmission;
};

const reviewSubmission = async (id, { status, feedback, adminId, adminName }) => {
  initializeInMemorySubmissions();

  // Find submission from database or in-memory store
  const submission = await getSubmissionById(id);
  if (!submission) {
    return {
      error: 'NOT_FOUND',
      code: 'SUBMISSION_NOT_FOUND',
      message: 'Submission not found to review.'
    };
  }

  const currentStatus = submission.status;
  const newStatus = status ? status.toUpperCase() : '';

  // Validate status
  if (!['APPROVED', 'REJECTED'].includes(newStatus)) {
    return {
      error: 'INVALID_STATUS',
      code: 'INVALID_STATUS',
      message: 'Review decision status must be either APPROVED or REJECTED.'
    };
  }

  // Prevent invalid state transitions:
  // 1. If currently APPROVED
  if (currentStatus === 'APPROVED') {
    if (newStatus === 'APPROVED') {
      return {
        error: 'ALREADY_APPROVED',
        code: 'INVALID_STATE_TRANSITION',
        message: 'Submission is already approved. Cannot re-approve an approved submission.'
      };
    }
    if (newStatus === 'REJECTED') {
      return {
        error: 'CANNOT_REJECT_APPROVED',
        code: 'INVALID_STATE_TRANSITION',
        message: 'Cannot reject an already approved and verified submission.'
      };
    }
  }

  // 2. If currently REJECTED
  if (currentStatus === 'REJECTED') {
    if (newStatus === 'REJECTED') {
      return {
        error: 'ALREADY_REJECTED',
        code: 'INVALID_STATE_TRANSITION',
        message: 'Submission is already rejected. Cannot re-reject a rejected submission.'
      };
    }
    if (newStatus === 'APPROVED') {
      return {
        error: 'CANNOT_APPROVE_REJECTED',
        code: 'INVALID_STATE_TRANSITION',
        message: 'Cannot approve an already rejected submission. The creator must submit new evidence.'
      };
    }
  }

  // 3. Rejection requires non-empty reason
  if (newStatus === 'REJECTED' && (!feedback || !feedback.trim())) {
    return {
      error: 'FEEDBACK_REQUIRED',
      code: 'FEEDBACK_REQUIRED',
      message: 'A rejection reason is mandatory so the creator understands what was missing or invalid.'
    };
  }

  const cleanFeedback = feedback && typeof feedback === 'string' ? feedback.trim() : null;
  const reviewTimestamp = new Date();

  const reviewEntry = {
    id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    submissionId: id,
    adminId,
    adminName: adminName || 'Admin Moderator',
    status: newStatus,
    feedback: cleanFeedback,
    createdAt: reviewTimestamp,
    updatedAt: reviewTimestamp
  };

  let updatedSubmission = null;
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const createdReview = await prisma.review.create({
        data: {
          submissionId: id,
          adminId,
          status: newStatus,
          feedback: cleanFeedback
        },
        include: {
          admin: { select: { id: true, name: true, email: true } }
        }
      });

      reviewEntry.id = createdReview.id;
      reviewEntry.createdAt = createdReview.createdAt;
      reviewEntry.updatedAt = createdReview.updatedAt;

      updatedSubmission = await prisma.submission.update({
        where: { id },
        data: {
          status: newStatus,
          updatedAt: reviewTimestamp
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          reviews: {
            include: { admin: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    } catch (err) {
      console.warn('[SubRepo] Prisma review sync failed:', err.message);
    }
  }

  // Update in-memory record
  let memSub = inMemorySubmissions.get(id);
  if (!memSub) {
    memSub = {
      ...submission,
      reviews: submission.reviews ? [...submission.reviews] : []
    };
  }
  memSub.status = newStatus;
  memSub.updatedAt = reviewTimestamp;
  if (!Array.isArray(memSub.reviews)) memSub.reviews = [];
  memSub.reviews.unshift(reviewEntry);
  inMemorySubmissions.set(id, memSub);

  return {
    success: true,
    submission: updatedSubmission || memSub,
    review: reviewEntry,
    reviewer: {
      id: adminId,
      name: adminName || 'Admin Moderator'
    },
    reviewedAt: reviewTimestamp
  };
};

/**
 * Find a submission by its screenshotUrl (used for auth-gated screenshot access).
 * Optionally filter by userId to enforce ownership for non-admin users.
 * @param {string} screenshotRef  - e.g. /api/uploads/screenshots/evidence-xxx.jpg
 * @param {string|null} userId    - if provided, must match submission.userId
 */
const getSubmissionByScreenshotRef = async (screenshotRef, userId = null) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const where = { screenshotUrl: screenshotRef };
      if (userId) where.userId = userId;

      const record = await prisma.submission.findFirst({ where });
      if (record) return record;
    } catch (err) {
      console.warn('[SubRepo] getSubmissionByScreenshotRef Prisma lookup failed:', err.message);
    }
  }

  // Fallback to in-memory
  for (const sub of inMemorySubmissions.values()) {
    if (sub.screenshotUrl === screenshotRef) {
      if (!userId || sub.userId === userId) return sub;
    }
  }
  return null;
};

/**
 * Attach an internal moderation note to a submission.
 * Strictly internal to administrators; never exposed to normal users.
 */
const addInternalNote = async (submissionId, { adminId, adminName, note }) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();
  const cleanNote = note && typeof note === 'string' ? note.trim().substring(0, 2000) : '';

  if (!cleanNote) {
    return {
      error: 'NOTE_REQUIRED',
      code: 'NOTE_REQUIRED',
      message: 'Internal review note content is required.'
    };
  }

  const noteEntry = {
    id: `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    submissionId,
    adminId,
    adminName: adminName || 'Admin Moderator',
    note: cleanNote,
    createdAt: new Date()
  };

  if (dbStatus.isConnected && prisma) {
    try {
      const created = await prisma.reviewNote.create({
        data: {
          submissionId,
          adminId,
          note: cleanNote
        },
        include: {
          admin: { select: { id: true, name: true, email: true } }
        }
      });
      return {
        id: created.id,
        submissionId: created.submissionId,
        adminId: created.adminId,
        adminName: created.admin?.name || adminName || 'Admin Moderator',
        note: created.note,
        createdAt: created.createdAt
      };
    } catch (err) {
      console.warn('[SubRepo] Prisma addInternalNote failed, falling back to memory:', err.message);
    }
  }

  const sub = inMemorySubmissions.get(submissionId);
  if (sub) {
    if (!sub.internalNotes) sub.internalNotes = [];
    sub.internalNotes.unshift(noteEntry);
  }
  return noteEntry;
};

/**
 * Record a formal clarification request sent by an admin to the creator.
 */
const createClarificationRequest = async (submissionId, { adminId, adminName, message }) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();
  const cleanMsg = message && typeof message === 'string' ? message.trim().substring(0, 1000) : '';

  if (!cleanMsg) {
    return {
      error: 'MESSAGE_REQUIRED',
      code: 'MESSAGE_REQUIRED',
      message: 'Clarification message to the creator is required.'
    };
  }

  const clarificationEntry = {
    id: `clar-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    submissionId,
    adminId,
    adminName: adminName || 'Admin Moderator',
    message: cleanMsg,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (dbStatus.isConnected && prisma) {
    try {
      const created = await prisma.clarificationRequest.create({
        data: {
          submissionId,
          adminId,
          message: cleanMsg,
          status: 'PENDING'
        },
        include: {
          admin: { select: { id: true, name: true, email: true } }
        }
      });
      return {
        id: created.id,
        submissionId: created.submissionId,
        adminId: created.adminId,
        adminName: created.admin?.name || adminName || 'Admin Moderator',
        message: created.message,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
      };
    } catch (err) {
      console.warn('[SubRepo] Prisma createClarificationRequest failed, falling back to memory:', err.message);
    }
  }

  const sub = inMemorySubmissions.get(submissionId);
  if (sub) {
    if (!sub.clarifications) sub.clarifications = [];
    sub.clarifications.unshift(clarificationEntry);
  }
  return clarificationEntry;
};

/**
 * Calculate previous & next submission IDs in current moderation queue context.
 */
const getQueueNavigation = async (currentId, filters = {}) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  const { status, platform, actionType, search } = filters;

  if (dbStatus.isConnected && prisma) {
    try {
      const where = {};
      if (status && status.toUpperCase() !== 'ALL') {
        where.status = status.toUpperCase();
      } else if (!status) {
        where.status = 'PENDING';
      }
      if (platform && platform.toUpperCase() !== 'ALL') {
        where.platform = platform.toUpperCase();
      }
      if (actionType && actionType.toUpperCase() !== 'ALL') {
        where.actionType = actionType.toUpperCase();
      }
      if (search && search.trim()) {
        const q = search.trim();
        where.OR = [
          { postUrl: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
        ];
      }

      const queue = await prisma.submission.findMany({
        where,
        select: { id: true },
        orderBy: { createdAt: 'desc' }
      });

      const ids = queue.map(q => q.id);
      const currentIndex = ids.indexOf(currentId);

      return {
        prevId: currentIndex > 0 ? ids[currentIndex - 1] : null,
        nextId: currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null,
        currentIndex: currentIndex >= 0 ? currentIndex + 1 : null,
        totalQueue: ids.length
      };
    } catch (err) {
      console.warn('[SubRepo] getQueueNavigation Prisma error:', err.message);
    }
  }

  // In-memory navigation
  let filtered = Array.from(inMemorySubmissions.values());
  const targetStatus = status && status.toUpperCase() !== 'ALL' ? status.toUpperCase() : !status ? 'PENDING' : null;
  if (targetStatus) filtered = filtered.filter(s => s.status === targetStatus);
  if (platform && platform.toUpperCase() !== 'ALL') filtered = filtered.filter(s => s.platform === platform.toUpperCase());
  if (actionType && actionType.toUpperCase() !== 'ALL') filtered = filtered.filter(s => s.actionType === actionType.toUpperCase());
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(s =>
      (s.postUrl && s.postUrl.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.userName && s.userName.toLowerCase().includes(q)) ||
      (s.userEmail && s.userEmail.toLowerCase().includes(q))
    );
  }
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const ids = filtered.map(s => s.id);
  const currentIndex = ids.indexOf(currentId);

  return {
    prevId: currentIndex > 0 ? ids[currentIndex - 1] : null,
    nextId: currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null,
    currentIndex: currentIndex >= 0 ? currentIndex + 1 : null,
    totalQueue: ids.length
  };
};

module.exports = {
  getAllSubmissions,
  getSubmissionsPaginated,
  getUserSubmissions,
  getSubmissionById,
  getSubmissionByScreenshotRef,
  createSubmission,
  reviewSubmission,
  addInternalNote,
  createClarificationRequest,
  getQueueNavigation
};
