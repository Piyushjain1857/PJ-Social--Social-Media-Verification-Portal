const { prisma, checkDatabaseConnection } = require('../config/db');
const {
  getActiveLevels,
  calculateUserLevel,
  getUserRankMetrics,
  getUserGamificationProfile,
  getUserXPChartData,
  getUserRankHistory
} = require('./levelService');
const { recordAuditLog } = require('./auditLogService');
const { createNotification } = require('../repositories/notificationRepository');
const { getUserTransactionsHistory } = require('../repositories/pointTransactionRepository');

const ACTION_NAMES = {
  LIKE: 'Like',
  COMMENT: 'Comment',
  STORY: 'Story',
  BONUS: 'Manual Bonus',
  ADJUSTMENT: 'Admin Adjustment'
};

const ACTION_ICONS = {
  LIKE: '❤️',
  COMMENT: '💬',
  STORY: '📱',
  BONUS: '🎁',
  ADJUSTMENT: '⚖️'
};

function getSourceFromTx(tx) {
  if (tx.submission?.platform) return tx.submission.platform;
  if (tx.metadata?.platform) return tx.metadata.platform;
  if (tx.actionType === 'BONUS' || tx.actionType === 'ADJUSTMENT') {
    return tx.metadata?.actorName || tx.metadata?.adminName || 'Admin Adjustment';
  }
  return 'Platform Activity';
}

/**
 * Format relative time (e.g. "2 hours ago", "Yesterday", "3 days ago")
 */
function formatRelativeTime(date) {
  if (!date) return 'No activity yet';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * List creators with gamification metrics, server-side search, filtering, and sorting
 */
const getAdminGamificationUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  level = '',
  minXP = '',
  maxXP = '',
  status = '',
  sortBy = 'highest_xp'
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * pageSize;

  const activeLevels = await getActiveLevels();

  // Build Prisma where filter
  const where = {
    role: 'USER' // Admin and Super Admin do not participate in gamification
  };

  if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status.toUpperCase())) {
    where.status = status.toUpperCase();
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { id: term }
    ];
  }

  const xpFilter = {};
  if (minXP !== '' && !isNaN(parseInt(minXP, 10))) {
    xpFilter.gte = parseInt(minXP, 10);
  }
  if (maxXP !== '' && !isNaN(parseInt(maxXP, 10))) {
    xpFilter.lte = parseInt(maxXP, 10);
  }
  if (Object.keys(xpFilter).length > 0) {
    where.totalXP = xpFilter;
  }

  // Sorting
  let orderBy = [{ totalXP: 'desc' }, { createdAt: 'asc' }];
  if (sortBy === 'lowest_xp') {
    orderBy = [{ totalXP: 'asc' }, { createdAt: 'asc' }];
  } else if (sortBy === 'highest_level') {
    orderBy = [{ totalXP: 'desc' }, { createdAt: 'asc' }];
  } else if (sortBy === 'lowest_level') {
    orderBy = [{ totalXP: 'asc' }, { createdAt: 'asc' }];
  } else if (sortBy === 'recent_activity') {
    orderBy = [{ updatedAt: 'desc' }];
  } else if (sortBy === 'name') {
    orderBy = [{ name: 'asc' }];
  }

  const [totalUsers, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        totalPoints: true,
        totalXP: true,
        createdAt: true,
        updatedAt: true,
        pointTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, actionType: true, xp: true, description: true }
        }
      }
    })
  ]);

  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  // Enrich users with Level, Level Name, Rank, and Last Activity
  const enrichedUsers = await Promise.all(
    users.map(async (u, idx) => {
      const userXP = u.totalXP ?? u.totalPoints ?? 0;
      const levelInfo = calculateUserLevel(userXP, activeLevels);

      // Real rank calculation
      let rank = skip + idx + 1;
      try {
        const usersAhead = await prisma.user.count({
          where: {
            role: 'USER',
            status: 'ACTIVE',
            OR: [
              { totalXP: { gt: userXP } },
              {
                totalXP: userXP,
                createdAt: { lt: u.createdAt }
              }
            ]
          }
        });
        rank = usersAhead + 1;
      } catch (err) {
        console.warn('Rank calculation fallback:', err.message);
      }

      const latestTx = u.pointTransactions && u.pointTransactions[0];
      const lastActivityDate = latestTx ? latestTx.createdAt : u.updatedAt || u.createdAt;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        totalXP: userXP,
        totalPoints: u.totalPoints ?? userXP,
        currentLevel: levelInfo.currentLevel,
        levelName: levelInfo.levelName,
        icon: levelInfo.icon,
        progressPercentage: levelInfo.progressPercentage,
        xpRemaining: levelInfo.xpRemaining,
        rank,
        lastActivity: formatRelativeTime(lastActivityDate),
        lastActivityDate,
        createdAt: u.createdAt
      };
    })
  );

  // Apply optional level filter if specified
  let filteredResults = enrichedUsers;
  if (level !== '' && !isNaN(parseInt(level, 10))) {
    const targetLvl = parseInt(level, 10);
    filteredResults = enrichedUsers.filter(u => u.currentLevel === targetLvl);
  }

  return {
    users: filteredResults,
    pagination: {
      page: pageNum,
      limit: pageSize,
      totalUsers,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  };
};

/**
 * Get comprehensive gamification details for a specific creator user
 */
const getAdminGamificationUserDetails = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true }
  });

  if (!user) {
    const err = new Error('User not found.');
    err.code = 'USER_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (user.role !== 'USER') {
    const err = new Error('Target account is an Administrator. Administrators manage game points and do not participate in gamification.');
    err.code = 'NOT_A_CREATOR';
    err.statusCode = 400;
    throw err;
  }

  const [profile, chartData, rankHistory, txResult, activeLevels] = await Promise.all([
    getUserGamificationProfile(userId),
    getUserXPChartData(userId, '30d'),
    getUserRankHistory(userId),
    getUserTransactionsHistory(userId, { page: 1, limit: 10 }),
    getActiveLevels()
  ]);

  const rawRecords = txResult.records || txResult.transactions || [];
  const formattedHistory = rawRecords.map(tx => {
    const xpVal = tx.xp !== undefined && tx.xp !== null ? tx.xp : tx.points;
    const act = tx.actionType || 'BONUS';
    return {
      id: tx.id,
      actionType: act,
      actionName: ACTION_NAMES[act] || act,
      icon: ACTION_ICONS[act] || '⚡',
      xp: xpVal,
      points: tx.points,
      description: tx.description,
      source: getSourceFromTx(tx),
      date: tx.createdAt,
      createdAt: tx.createdAt
    };
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      memberSince: user.createdAt,
      totalXP: profile.totalXP || 0,
      totalPoints: profile.totalPoints || profile.totalXP || 0,
      currentLevel: profile.currentLevel || 1,
      levelName: profile.levelName || 'Novice'
    },
    profile,
    chartData: chartData.points || [],
    rankHistory: rankHistory.timeline || [],
    trend: rankHistory.trend || 'stable',
    recentHistory: formattedHistory,
    historyPagination: {
      page: txResult.page || 1,
      limit: txResult.limit || 10,
      totalCount: txResult.totalCount || formattedHistory.length,
      totalPages: txResult.totalPages || 1
    },
    levelJourney: activeLevels.map(lvl => ({
      levelNumber: lvl.levelNumber,
      name: lvl.name,
      xpRequired: lvl.xpRequired,
      cumulativeXP: lvl.cumulativeXP,
      isCompleted: profile.totalXP >= (lvl.nextThreshold || lvl.cumulativeXP),
      isCurrent: lvl.levelNumber === profile.currentLevel,
      isLocked: lvl.levelNumber > profile.currentLevel
    }))
  };
};

/**
 * Get platform-wide admin gamification analytics and distribution telemetry
 */
const getAdminGamificationAnalytics = async () => {
  const activeLevels = await getActiveLevels();

  // Aggregate user counts & total XP
  const [totalUsers, activeUsers, xpAggregate] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } }),
    prisma.user.aggregate({
      where: { role: 'USER' },
      _sum: { totalXP: true },
      _max: { totalXP: true }
    })
  ]);

  const totalXP = xpAggregate._sum.totalXP || 0;
  const highestXP = xpAggregate._max.totalXP || 0;
  const averageXP = totalUsers > 0 ? Math.round(totalXP / totalUsers) : 0;

  // Highest Level attained
  const highestLevelUser = await prisma.user.findFirst({
    where: { role: 'USER' },
    orderBy: { totalXP: 'desc' },
    select: { totalXP: true }
  });
  const highestLevelInfo = highestLevelUser ? calculateUserLevel(highestLevelUser.totalXP, activeLevels) : { currentLevel: 1 };

  // Active in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeTxUsers = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: thirtyDaysAgo },
      user: { role: 'USER' }
    }
  });
  const activeGamificationUsers = activeTxUsers.length;

  // XP Distribution buckets
  const [bucket0, bucket100, bucket500, bucket1000, bucket2500] = await Promise.all([
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 0, lt: 100 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 100, lt: 500 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 500, lt: 1000 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 1000, lt: 2500 } } }),
    prisma.user.count({ where: { role: 'USER', totalXP: { gte: 2500 } } })
  ]);

  const xpDistribution = [
    { range: '0–99 XP', count: bucket0, label: 'Novice' },
    { range: '100–499 XP', count: bucket100, label: 'Explorer' },
    { range: '500–999 XP', count: bucket500, label: 'Active' },
    { range: '1,000–2,499 XP', count: bucket1000, label: 'Veteran' },
    { range: '2,500+ XP', count: bucket2500, label: 'Champion' }
  ];

  // Activity distribution by ActionType
  const activitySums = await prisma.pointTransaction.groupBy({
    by: ['actionType'],
    _count: { id: true },
    _sum: { xp: true }
  });

  const activityDistribution = activitySums.map(a => ({
    action: a.actionType,
    label: ACTION_NAMES[a.actionType] || a.actionType,
    icon: ACTION_ICONS[a.actionType] || '⚡',
    count: a._count.id,
    totalXP: a._sum.xp || 0
  }));

  // Top 5 creators
  const topUsersQuery = await prisma.user.findMany({
    where: { role: 'USER', status: 'ACTIVE' },
    orderBy: [{ totalXP: 'desc' }, { createdAt: 'asc' }],
    take: 5,
    select: { id: true, name: true, email: true, totalXP: true }
  });

  const topUsers = topUsersQuery.map((u, i) => {
    const lvl = calculateUserLevel(u.totalXP, activeLevels);
    return {
      rank: i + 1,
      id: u.id,
      name: u.name,
      email: u.email,
      totalXP: u.totalXP,
      level: lvl.currentLevel,
      levelName: lvl.levelName
    };
  });

  return {
    metrics: {
      totalUsers,
      activeUsers,
      activeGamificationUsers,
      totalXPDistributed: totalXP,
      averageUserXP: averageXP,
      highestXP,
      highestLevel: highestLevelInfo.currentLevel
    },
    xpDistribution,
    activityDistribution,
    topUsers
  };
};

/**
 * Adjust user XP with strict validation, immutable transaction recording, notification, and audit logging
 */
const adjustUserXP = async ({
  userId,
  type = 'ADD', // 'ADD' | 'REMOVE'
  amount,
  reason,
  adminUser
}) => {
  if (!userId) {
    const err = new Error('Target user ID is mandatory.');
    err.code = 'USER_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    const err = new Error('Adjustment amount must be a positive integer greater than zero.');
    err.code = 'INVALID_AMOUNT';
    err.statusCode = 400;
    throw err;
  }

  if (!reason || typeof reason !== 'string' || !reason.trim() || reason.trim().length < 3) {
    const err = new Error('A detailed reason (at least 3 characters) is mandatory for XP adjustments.');
    err.code = 'REASON_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  const cleanReason = reason.trim();
  const cleanType = String(type).toUpperCase() === 'REMOVE' ? 'REMOVE' : 'ADD';
  const delta = cleanType === 'REMOVE' ? -parsedAmount : parsedAmount;

  // Verify target user exists and is a normal creator
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, totalXP: true, totalPoints: true }
  });

  if (!targetUser) {
    const err = new Error('Target user does not exist.');
    err.code = 'USER_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (targetUser.role !== 'USER') {
    const err = new Error('Game points can only be adjusted for normal creator users. Administrators cannot hold game points.');
    err.code = 'ADMIN_CANNOT_HAVE_POINTS';
    err.statusCode = 400;
    throw err;
  }

  const previousXP = targetUser.totalXP ?? targetUser.totalPoints ?? 0;
  // Floor at 0 so user XP never goes negative
  const newXP = Math.max(0, previousXP + delta);
  const actualDelta = newXP - previousXP;

  // Execute database transaction
  const [transaction, updatedUser] = await prisma.$transaction([
    prisma.pointTransaction.create({
      data: {
        userId,
        points: delta,
        xp: delta,
        actionType: 'ADJUSTMENT',
        description: `Admin Adjustment: ${delta > 0 ? '+' : ''}${delta} XP (${cleanReason})`,
        metadata: {
          actorId: adminUser.id,
          actorName: adminUser.name,
          actorRole: adminUser.role,
          reason: cleanReason,
          adjustmentType: cleanType,
          requestedAmount: parsedAmount,
          actualDelta,
          previousXP,
          newXP,
          timestamp: new Date().toISOString()
        }
      }
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: newXP,
        totalPoints: newXP
      },
      select: { id: true, name: true, email: true, totalXP: true, totalPoints: true }
    })
  ]);

  // Recalculate level
  const activeLevels = await getActiveLevels();
  const newLevelInfo = calculateUserLevel(newXP, activeLevels);

  // Send in-app notification to target user
  try {
    await createNotification({
      userId,
      type: 'ACCOUNT_ALERT',
      title: delta > 0 ? 'XP Bonus Awarded!' : 'XP Adjustment Notice',
      message: `Admin ${adminUser.name} adjusted your XP by ${delta > 0 ? '+' : ''}${delta} XP. Reason: ${cleanReason}`,
      metadata: {
        adjustmentType: cleanType,
        amount: delta,
        reason: cleanReason,
        previousXP,
        newXP,
        newLevel: newLevelInfo.currentLevel,
        adjustedBy: adminUser.name
      }
    });
  } catch (notifErr) {
    console.warn('[AdminGamificationService] Failed to send notification:', notifErr.message);
  }

  // Create immutable AuditLog entry
  try {
    await recordAuditLog({
      actor: adminUser.email || adminUser.name,
      action: 'XP_ADJUSTMENT',
      entity: 'User',
      entityId: userId,
      details: `Admin ${adminUser.name} adjusted user ${targetUser.name} (${targetUser.email}) XP by ${delta > 0 ? '+' : ''}${delta} XP. Reason: ${cleanReason}`,
      metadata: {
        actorId: adminUser.id,
        actorRole: adminUser.role,
        targetUserId: userId,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        amount: delta,
        reason: cleanReason,
        previousXP,
        newXP,
        newLevel: newLevelInfo.currentLevel,
        levelName: newLevelInfo.levelName
      }
    });
  } catch (auditErr) {
    console.warn('[AdminGamificationService] Failed to record audit log:', auditErr.message);
  }

  return {
    success: true,
    message: `Successfully adjusted XP for ${targetUser.name} by ${delta > 0 ? '+' : ''}${delta} XP.`,
    data: {
      userId,
      userName: targetUser.name,
      previousXP,
      previousBalance: previousXP,
      newXP,
      newBalance: newXP,
      actualDelta,
      deltaXP: actualDelta,
      level: newLevelInfo.currentLevel,
      currentLevel: newLevelInfo.currentLevel,
      levelName: newLevelInfo.levelName,
      transactionId: transaction.id
    }
  };
};

module.exports = {
  getAdminGamificationUsers,
  getAdminGamificationUserDetails,
  getAdminGamificationAnalytics,
  adjustUserXP
};
