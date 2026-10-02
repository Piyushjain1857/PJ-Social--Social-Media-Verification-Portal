const { prisma, checkDatabaseConnection } = require('../config/db');

// In-memory store for fallback/offline operations
const inMemoryPointTransactions = new Map();

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
};

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
      // Use transaction to ensure point/XP record creation and user balance increment are atomic
      const [tx, updatedUser] = await prisma.$transaction([
        prisma.pointTransaction.create({
          data: {
            userId,
            submissionId: submissionId || null,
            points: parsedPoints,
            xp: parsedPoints,
            actionType,
            description: description || `XP/Points for ${actionType}`,
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
            },
            totalXP: {
              increment: parsedPoints
            }
          },
          select: { id: true, totalPoints: true, totalXP: true, name: true, email: true }
        })
      ]);

      createdRecord = tx;
      updatedTotalPoints = updatedUser.totalXP ?? updatedUser.totalPoints;
    } catch (err) {
      console.warn('[PointRepo] Prisma transaction failed, falling back to memory store:', err.message);
    }
  }

  // Always keep in-memory store updated
  const memTx = createdRecord || txData;
  inMemoryPointTransactions.set(memTx.id, memTx);

  if (!createdRecord) {
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
 * - pointsThisWeek & pointsThisMonth
 * - recentTransactions (latest 5)
 * - breakdown by action type (counts and point subtotals)
 * - latestApprovedActivities
 */
const getUserPointsSummary = async (userId) => {
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const [
        user,
        transactions,
        breakdownGroup,
        weekGroup,
        monthGroup,
        approvedSubs
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, role: true, totalPoints: true, totalXP: true }
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
          _sum: { points: true, xp: true },
          _count: { id: true }
        }),
        prisma.pointTransaction.aggregate({
          where: { userId, createdAt: { gte: startOfWeek } },
          _sum: { points: true, xp: true }
        }),
        prisma.pointTransaction.aggregate({
          where: { userId, createdAt: { gte: startOfMonth } },
          _sum: { points: true, xp: true }
        }),
        prisma.submission.findMany({
          where: { userId, status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            platform: true,
            actionType: true,
            postUrl: true,
            createdAt: true,
            updatedAt: true
          }
        })
      ]);

      if (user) {
        const breakdown = {
          LIKE: { count: 0, points: 0, xp: 0 },
          COMMENT: { count: 0, points: 0, xp: 0 },
          STORY: { count: 0, points: 0, xp: 0 },
          BONUS: { count: 0, points: 0, xp: 0 },
          ADJUSTMENT: { count: 0, points: 0, xp: 0 }
        };

        let calculatedTotal = 0;
        breakdownGroup.forEach(g => {
          const type = g.actionType;
          const count = g._count.id || 0;
          const points = g._sum.points || g._sum.xp || 0;
          calculatedTotal += points;
          if (breakdown[type]) {
            breakdown[type] = { count, points, xp: points };
          }
        });

        const finalTotal = user.totalXP ?? user.totalPoints ?? calculatedTotal;

        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          totalPoints: user.totalPoints ?? calculatedTotal,
          totalXP: finalTotal,
          auditedTotalPoints: calculatedTotal,
          pointsThisWeek: weekGroup._sum.points || weekGroup._sum.xp || 0,
          pointsThisMonth: monthGroup._sum.points || monthGroup._sum.xp || 0,
          xpThisWeek: weekGroup._sum.xp || weekGroup._sum.points || 0,
          xpThisMonth: monthGroup._sum.xp || monthGroup._sum.points || 0,
          recentTransactions: transactions,
          latestApprovedActivities: approvedSubs,
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
  let pointsThisWeek = 0;
  let pointsThisMonth = 0;

  userTxList.forEach(t => {
    total += t.points;
    const txDate = new Date(t.createdAt);
    if (txDate >= startOfWeek) pointsThisWeek += t.points;
    if (txDate >= startOfMonth) pointsThisMonth += t.points;

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
    pointsThisWeek,
    pointsThisMonth,
    recentTransactions: userTxList.slice(0, 5),
    latestApprovedActivities: [],
    breakdown
  };
};

/**
 * Get paginated point transaction history for a user with server-side filters.
 */
const getUserTransactionsHistory = async (userId, {
  page = 1,
  limit = 10,
  search,
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
        if (actionType === 'ADJUSTMENT' || actionType === 'ADJUSTMENTS') {
          where.actionType = { in: ['ADMIN_ADJUSTMENT', 'SUPER_ADMIN_ADJUSTMENT', 'ADJUSTMENT'] };
        } else {
          where.actionType = actionType;
        }
      }

      if (search && search.trim()) {
        where.OR = [
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { submission: { postUrl: { contains: search.trim(), mode: 'insensitive' } } }
        ];
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
    if (actionType === 'ADJUSTMENT' || actionType === 'ADJUSTMENTS') {
      list = list.filter(t => ['ADMIN_ADJUSTMENT', 'SUPER_ADMIN_ADJUSTMENT', 'ADJUSTMENT'].includes(t.actionType));
    } else {
      list = list.filter(t => t.actionType === actionType);
    }
  }

  if (search && search.trim()) {
    const sTerm = search.trim().toLowerCase();
    list = list.filter(t => (t.description && t.description.toLowerCase().includes(sTerm)));
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

/**
 * Super Admin: Get all point transactions across all users with user search & filters.
 */
const getAllPointTransactions = async ({
  page = 1,
  limit = 20,
  search,
  actionType,
  startDate,
  endDate,
  sortBy = 'createdAt',
  sortOrder = 'desc'
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * pageSize;
  const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const where = {};

      if (actionType && actionType !== 'ALL') {
        where.actionType = actionType;
      }

      if (search && search.trim()) {
        const q = search.trim();
        where.OR = [
          { description: { contains: q, mode: 'insensitive' } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } }
        ];
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
            user: { select: { id: true, name: true, email: true, role: true, totalPoints: true } },
            submission: { select: { id: true, platform: true, actionType: true, postUrl: true, status: true } }
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
      console.warn('[PointRepo] Prisma getAllPointTransactions failed, using memory fallback:', err.message);
    }
  }

  // Memory fallback
  let list = Array.from(inMemoryPointTransactions.values());

  if (actionType && actionType !== 'ALL') {
    list = list.filter(t => t.actionType === actionType);
  }

  if (search && search.trim()) {
    const sTerm = search.trim().toLowerCase();
    list = list.filter(t => (t.description && t.description.toLowerCase().includes(sTerm)));
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

/**
 * Portal-Wide Leaderboard calculation with timeframes:
 * - 'all_time'
 * - 'this_month'
 * - 'this_week'
 */
const getLeaderboardData = async ({
  timeframe = 'all_time',
  page = 1,
  limit = 20
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * pageSize;
  const cleanTimeframe = ['this_week', 'this_month', 'all_time'].includes(timeframe)
    ? timeframe
    : 'all_time';

  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      let aggregates = [];
      
      if (cleanTimeframe === 'all_time') {
        const users = await prisma.user.findMany({
          where: { role: 'USER', status: 'ACTIVE' },
          select: {
            id: true,
            totalXP: true,
            createdAt: true,
            name: true,
            role: true,
            _count: { select: { submissions: { where: { status: 'APPROVED' } } } }
          }
        });

        const maxPts = await prisma.pointTransaction.groupBy({
          by: ['userId'],
          where: { user: { role: 'USER', status: 'ACTIVE' } },
          _max: { createdAt: true }
        });
        const maxPtMap = new Map(maxPts.map(pt => [pt.userId, pt._max.createdAt]));

        aggregates = users.map(u => ({
          userId: u.id,
          xp: u.totalXP || 0,
          achievementTime: maxPtMap.get(u.id) ? maxPtMap.get(u.id).getTime() : u.createdAt.getTime(),
          userRecord: u
        }));
      } else {
        const startDate = cleanTimeframe === 'this_week' ? getStartOfWeek() : getStartOfMonth();
        const ptAggregates = await prisma.pointTransaction.groupBy({
          by: ['userId'],
          where: {
            createdAt: { gte: startDate },
            user: { role: 'USER', status: 'ACTIVE' }
          },
          _sum: { xp: true },
          _max: { createdAt: true }
        });
        
        // Also fetch active users with 0 xp this period if we want them on the board? 
        // Typically timeframe leaderboards only show active users in that period.
        // We will include all users but those without txs have 0 period XP.
        const users = await prisma.user.findMany({
          where: { role: 'USER', status: 'ACTIVE' },
          select: {
            id: true,
            totalXP: true,
            createdAt: true,
            name: true,
            role: true,
            _count: { select: { submissions: { where: { status: 'APPROVED' } } } }
          }
        });
        
        const ptMap = new Map(ptAggregates.map(pt => [pt.userId, pt]));
        
        aggregates = users.map(u => {
          const pt = ptMap.get(u.id);
          return {
            userId: u.id,
            xp: pt ? (pt._sum.xp || 0) : 0,
            achievementTime: pt && pt._max.createdAt ? pt._max.createdAt.getTime() : u.createdAt.getTime(),
            userRecord: u
          };
        });
      }

      // Tie-breaking rule:
      // 1. Higher XP
      // 2. Earlier achievement of that XP (smaller achievementTime)
      // 3. Stable user ID fallback
      aggregates.sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (a.achievementTime !== b.achievementTime) return a.achievementTime - b.achievementTime;
        return a.userId.localeCompare(b.userId);
      });

      const totalUsers = aggregates.length;
      const totalPages = Math.ceil(totalUsers / pageSize) || 1;
      const pagedAggregates = aggregates.slice(skip, skip + pageSize);

      const leaderboard = pagedAggregates.map((agg, idx) => {
        const u = agg.userRecord;
        return {
          rank: skip + idx + 1,
          userId: u.id,
          displayName: u.name,
          name: u.name,
          role: u.role,
          totalXP: cleanTimeframe === 'all_time' ? u.totalXP : agg.xp, 
          totalPoints: cleanTimeframe === 'all_time' ? u.totalXP : agg.xp, // compatibility
          periodPoints: agg.xp,
          approvedSubmissionsCount: u._count?.submissions || 0
        };
      });

      return {
        leaderboard,
        pagination: {
          page: pageNum,
          limit: pageSize,
          totalUsers,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        timeframe: cleanTimeframe
      };
    } catch (err) {
      console.warn('[PointRepo] Prisma getLeaderboardData failed, using fallback:', err.message);
    }
  }

  // Memory fallback
  const userScores = new Map();
  for (const tx of inMemoryPointTransactions.values()) {
    let include = true;
    if (cleanTimeframe === 'this_week') {
      include = new Date(tx.createdAt) >= getStartOfWeek();
    } else if (cleanTimeframe === 'this_month') {
      include = new Date(tx.createdAt) >= getStartOfMonth();
    }

    if (include) {
      userScores.set(tx.userId, (userScores.get(tx.userId) || 0) + tx.points);
    }
  }

  const sortedList = Array.from(userScores.entries())
    .map(([uId, pts]) => ({ userId: uId, points: pts }))
    .sort((a, b) => b.points - a.points);

  const totalUsers = sortedList.length;
  const totalPages = Math.ceil(totalUsers / pageSize) || 1;
  const pagedList = sortedList.slice(skip, skip + pageSize);

  const leaderboard = pagedList.map((item, idx) => ({
    rank: skip + idx + 1,
    userId: item.userId,
    name: 'Creator',
    role: 'USER',
    totalPoints: item.points,
    periodPoints: item.points,
    approvedSubmissionsCount: 0
  }));

  return {
    leaderboard,
    pagination: {
      page: pageNum,
      limit: pageSize,
      totalUsers,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    timeframe: cleanTimeframe
  };
};

/**
 * Get user rank on leaderboard for requested timeframe and difference to next rank.
 */
const getUserRankData = async (userId, timeframe = 'all_time') => {
  const cleanTimeframe = ['this_week', 'this_month', 'all_time'].includes(timeframe)
    ? timeframe
    : 'all_time';

  const fullData = await getLeaderboardData({ timeframe: cleanTimeframe, page: 1, limit: 1000 });
  const list = fullData.leaderboard || [];

  const userIndex = list.findIndex(item => item.userId === userId);

  if (userIndex === -1) {
    // User has not earned points or is not on the leaderboard yet
    const lastRank = list.length > 0 ? list[list.length - 1] : null;
    return {
      rank: list.length + 1,
      totalPoints: 0,
      periodPoints: 0,
      nextRank: lastRank ? lastRank.rank : null,
      pointsToNextRank: lastRank ? Math.max(1, lastRank.periodPoints + 1) : 0,
      totalParticipants: list.length,
      timeframe: cleanTimeframe
    };
  }

  const currentItem = list[userIndex];
  const higherItem = userIndex > 0 ? list[userIndex - 1] : null;
  const pointsToNextRank = higherItem
    ? Math.max(1, (higherItem.periodPoints - currentItem.periodPoints) + 1)
    : 0;

  return {
    rank: currentItem.rank,
    totalPoints: currentItem.totalPoints,
    periodPoints: currentItem.periodPoints,
    nextRank: higherItem ? higherItem.rank : null,
    pointsToNextRank,
    totalParticipants: list.length,
    timeframe: cleanTimeframe
  };
};

/**
 * Admin: Gamification overview of creators (total points, level stats, recent activity)
 */
const getAdminGamificationOverviewData = async ({ page = 1, limit = 15, search }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * pageSize;

  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.isConnected && prisma) {
    try {
      const where = { role: 'USER' };
      if (search && search.trim()) {
        const q = search.trim();
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ];
      }

      const [totalCount, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { totalPoints: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            totalPoints: true,
            createdAt: true,
            _count: {
              select: {
                submissions: { where: { status: 'APPROVED' } },
                pointTransactions: true
              }
            }
          }
        })
      ]);

      const totalPages = Math.ceil(totalCount / pageSize) || 1;

      return {
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          totalPoints: u.totalPoints,
          approvedSubmissionsCount: u._count?.submissions || 0,
          transactionsCount: u._count?.pointTransactions || 0,
          joinedAt: u.createdAt
        })),
        totalCount,
        page: pageNum,
        limit: pageSize,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      };
    } catch (err) {
      console.warn('[PointRepo] Prisma getAdminGamificationOverviewData failed:', err.message);
    }
  }

  return {
    users: [],
    totalCount: 0,
    page: pageNum,
    limit: pageSize,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  };
};

module.exports = {
  findTransactionBySubmissionId,
  createPointTransaction,
  getUserPointsSummary,
  getUserTransactionsHistory,
  getAllPointTransactions,
  getLeaderboardData,
  getUserRankData,
  getAdminGamificationOverviewData
};
