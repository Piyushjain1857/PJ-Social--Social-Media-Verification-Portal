const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory store for fallback/offline operations
const inMemoryPointTransactions = new Map();

/**
 * Find any existing point transaction associated with a specific submission ID.
 * Crucial for duplicate prevention: an approved submission must NEVER award points twice.
 */
const findTransactionBySubmissionId = async (submissionId) => {
  if (!submissionId) return null;

  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.isConnected && prisma) {
    try {
      const record = await prisma.pointTransaction.findFirst({
        where: { submissionId },
        include: {
          submission: {
            select: { id: true, platform: true, actionType: true, status: true }
          }
        }
      });
      if (record) return record;
    } catch (err) {
      console.warn('[PointRepo] Prisma findFirst by submissionId failed, falling back:', err.message);
    }
  }

  // Check in-memory store
  for (const tx of inMemoryPointTransactions.values()) {
    if (tx.submissionId === submissionId) {
      return tx;
    }
  }

  return null;
};

/**
 * Create a new auditable PointTransaction and atomically update User totalPoints.
 */
const createPointTransaction = async ({
  userId,
  submissionId = null,
  points,
  actionType,
  description,
  metadata = null
}) => {
  const parsedPoints = parseInt(points, 10);
  const now = new Date();
  const txId = `pt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  const txData = {
    id: txId,
    userId,
    submissionId: submissionId || null,
    points: parsedPoints,
    actionType,
    description: description || `Points for ${actionType}`,
    metadata: metadata || null,
    createdAt: now
  };

  const dbStatus = await checkDatabaseConnection();
  let createdRecord = null;
  let updatedTotalPoints = 0;

  if (dbStatus.isConnected && prisma) {
    try {
      // Use transaction to ensure point record creation and user balance increment are atomic
      const [tx, updatedUser] = await prisma.$transaction([
        prisma.pointTransaction.create({
          data: {
            userId,
            submissionId: submissionId || null,
            points: parsedPoints,
            actionType,
            description: description || `Points for ${actionType}`,
            metadata: metadata || null
          },
          include: {
            submission: {
              select: { id: true, platform: true, actionType: true, status: true, postUrl: true }
            }
          }
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            totalPoints: {
              increment: parsedPoints
            }
          },
          select: { id: true, totalPoints: true, name: true, email: true }
        })
      ]);

      createdRecord = tx;
      updatedTotalPoints = updatedUser.totalPoints;
    } catch (err) {
      console.warn('[PointRepo] Prisma transaction failed, falling back to memory store:', err.message);
    }
  }

  // Always keep in-memory store updated
  const memTx = createdRecord || txData;
  inMemoryPointTransactions.set(memTx.id, memTx);

  if (!createdRecord) {
    // Compute total from in-memory records
    let runningTotal = 0;
    for (const t of inMemoryPointTransactions.values()) {
      if (t.userId === userId) {
        runningTotal += t.points;
      }
    }
    updatedTotalPoints = runningTotal;
  }

  return {
    transaction: createdRecord || memTx,
    totalPoints: updatedTotalPoints
  };
};

/**
 * Get user points summary:
 * - totalPoints (from user record and audited sum of transactions)
 * - recentTransactions (latest 5)
 * - breakdown by action type (counts and point subtotals)
 */
const getUserPointsSummary = async (userId) => {
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const [user, transactions, breakdownGroup] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, role: true, totalPoints: true }
        }),
        prisma.pointTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            submission: {
              select: { id: true, platform: true, actionType: true, postUrl: true }
            }
          }
        }),
        prisma.pointTransaction.groupBy({
          by: ['actionType'],
          where: { userId },
          _sum: { points: true },
          _count: { id: true }
        })
      ]);

      if (user) {
        const breakdown = {
          LIKE: { count: 0, points: 0 },
          COMMENT: { count: 0, points: 0 },
          STORY: { count: 0, points: 0 },
          BONUS: { count: 0, points: 0 },
          ADJUSTMENT: { count: 0, points: 0 }
        };

        let calculatedTotal = 0;
        breakdownGroup.forEach(g => {
          const type = g.actionType;
          const count = g._count.id || 0;
          const points = g._sum.points || 0;
          calculatedTotal += points;
          if (breakdown[type]) {
            breakdown[type] = { count, points };
          } else {
            breakdown[type] = { count, points };
          }
        });

        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          totalPoints: user.totalPoints ?? calculatedTotal,
          auditedTotalPoints: calculatedTotal,
          recentTransactions: transactions,
          breakdown
        };
      }
    } catch (err) {
      console.warn('[PointRepo] Prisma getUserPointsSummary failed, using memory fallback:', err.message);
    }
  }

  // Fallback in-memory
  const userTxList = Array.from(inMemoryPointTransactions.values())
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const breakdown = {
    LIKE: { count: 0, points: 0 },
    COMMENT: { count: 0, points: 0 },
    STORY: { count: 0, points: 0 },
    BONUS: { count: 0, points: 0 },
    ADJUSTMENT: { count: 0, points: 0 }
  };

  let total = 0;
  userTxList.forEach(t => {
    total += t.points;
    if (breakdown[t.actionType]) {
      breakdown[t.actionType].count += 1;
      breakdown[t.actionType].points += t.points;
    }
  });

  return {
    userId,
    userName: 'User',
    userEmail: '',
    totalPoints: total,
    auditedTotalPoints: total,
    recentTransactions: userTxList.slice(0, 5),
    breakdown
  };
};

/**
 * Get paginated point transaction history for a user with server-side filters.
 */
const getUserTransactionsHistory = async (userId, {
  page = 1,
  limit = 10,
  actionType,
  startDate,
  endDate,
  sortBy = 'createdAt',
  sortOrder = 'desc'
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * pageSize;
  const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const where = { userId };

      if (actionType && actionType !== 'ALL') {
        where.actionType = actionType;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          where.createdAt.gte = s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          where.createdAt.lte = e;
        }
      }

      const allowedSortFields = ['createdAt', 'points', 'actionType'];
      const fieldToSort = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

      const [totalCount, records] = await Promise.all([
        prisma.pointTransaction.count({ where }),
        prisma.pointTransaction.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { [fieldToSort]: order },
          include: {
            submission: {
              select: { id: true, platform: true, actionType: true, postUrl: true, status: true }
            }
          }
        })
      ]);

      const totalPages = Math.ceil(totalCount / pageSize) || 1;

      return {
        records,
        totalCount,
        page: pageNum,
        limit: pageSize,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      };
    } catch (err) {
      console.warn('[PointRepo] Prisma getUserTransactionsHistory failed, using memory fallback:', err.message);
    }
  }

  // Memory fallback
  let list = Array.from(inMemoryPointTransactions.values()).filter(t => t.userId === userId);

  if (actionType && actionType !== 'ALL') {
    list = list.filter(t => t.actionType === actionType);
  }

  if (startDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    list = list.filter(t => new Date(t.createdAt) >= s);
  }

  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    list = list.filter(t => new Date(t.createdAt) <= e);
  }

  list.sort((a, b) => {
    let aVal = a[sortBy] ?? a.createdAt;
    let bVal = b[sortBy] ?? b.createdAt;
    if (sortBy === 'createdAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const totalCount = list.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const records = list.slice(skip, skip + pageSize);

  return {
    records,
    totalCount,
    page: pageNum,
    limit: pageSize,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  };
};

module.exports = {
  findTransactionBySubmissionId,
  createPointTransaction,
  getUserPointsSummary,
  getUserTransactionsHistory
};
