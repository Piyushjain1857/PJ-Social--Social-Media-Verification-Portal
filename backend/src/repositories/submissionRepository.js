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

const getUserSubmissions = async (userId, filters = {}) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  const { page = 1, limit = 10, search, status, platform } = filters;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  if (dbStatus.isConnected && prisma) {
    try {
      const where = { userId };
      
      if (status) where.status = status.toUpperCase();
      if (platform) where.platform = platform.toUpperCase();
      if (search) {
        where.OR = [
          { postUrl: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const totalCount = await prisma.submission.count({ where });
      const records = await prisma.submission.findMany({
        where,
        include: {
          reviews: { include: { admin: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      });
      return { records, totalCount, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(totalCount / parseInt(limit)) };
    } catch (err) {
      console.warn('[SubRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  let memoryRecords = Array.from(inMemorySubmissions.values())
    .filter(s => s.userId === userId);
    
  if (status) memoryRecords = memoryRecords.filter(s => s.status === status.toUpperCase());
  if (platform) memoryRecords = memoryRecords.filter(s => s.platform === platform.toUpperCase());
  if (search) {
    const s = search.toLowerCase();
    memoryRecords = memoryRecords.filter(sub => 
      (sub.postUrl && sub.postUrl.toLowerCase().includes(s)) ||
      (sub.description && sub.description.toLowerCase().includes(s))
    );
  }

  memoryRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalCount = memoryRecords.length;
  memoryRecords = memoryRecords.slice(skip, skip + parseInt(limit));

  return { records: memoryRecords, totalCount, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(totalCount / parseInt(limit)) };
};

const getSubmissionById = async (id) => {
  initializeInMemorySubmissions();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const record = await prisma.submission.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          reviews: { include: { admin: { select: { id: true, name: true } } } }
        }
      });
      if (record) return record;
    } catch (err) {
      console.warn('[SubRepo] Prisma lookup failed, falling back to memory store:', err.message);
    }
  }

  return inMemorySubmissions.get(id) || null;
};

const createSubmission = async ({ userId, userName, userEmail, platform, actionType, postUrl, screenshotUrl, description }) => {
  initializeInMemorySubmissions();
  const id = `sub-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const newSubmission = {
    id,
    userId,
    userName: userName || 'Creator',
    userEmail: userEmail || '',
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
          platform,
          actionType,
          postUrl,
          screenshotUrl,
          description,
          status: 'PENDING'
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
  const submission = inMemorySubmissions.get(id);

  if (!submission) return null;

  const reviewEntry = {
    id: `rev-${Date.now().toString(36)}`,
    submissionId: id,
    adminId,
    adminName: adminName || 'Admin Moderator',
    status,
    feedback: feedback || null,
    createdAt: new Date()
  };

  submission.status = status;
  submission.updatedAt = new Date();
  submission.reviews.push(reviewEntry);
  inMemorySubmissions.set(id, submission);

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      await prisma.submission.update({
        where: { id },
        data: { status }
      });
      await prisma.review.create({
        data: {
          submissionId: id,
          adminId,
          status,
          feedback
        }
      });
    } catch (err) {
      console.warn('[SubRepo] Prisma review sync failed:', err.message);
    }
  }

  return { submission, review: reviewEntry };
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

module.exports = {
  getAllSubmissions,
  getUserSubmissions,
  getSubmissionById,
  getSubmissionByScreenshotRef,
  createSubmission,
  reviewSubmission
};
